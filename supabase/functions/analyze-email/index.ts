// ============================================================================
// analyze-email — Supabase Edge Function (Deno)
// ----------------------------------------------------------------------------
// Orchestrates the defensive analysis of an uploaded .eml file:
//   1. Authenticates the caller (RLS is enforced with their JWT).
//   2. Reads the .eml as TEXT only (never executes attachments or opens links).
//   3. Extracts headers / URLs / IPs and detects suspicious patterns.
//   4. Queries security providers (VirusTotal, Web Risk, AbuseIPDB, MaxMind,
//      MXToolbox). Missing keys => "not_configured", never a false "safe".
//   5. Computes a 0..100 score + risk category.
//   6. Persists scans + scan_reports + scan_indicators (owner-only via RLS).
//   7. Returns the scan and its report.
//
// SECURITY NOTES:
//   - No third-party API key is hardcoded. Set real secrets later from VS Code:
//       supabase secrets set VIRUSTOTAL_API_KEY=...   (etc.)
//   - We never log secrets, the raw email body, passwords, or PII.
//
// Deploy from VS Code:
//   supabase functions deploy analyze-email
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  checkAbuseIPDB,
  checkMaxMind,
  checkMXToolbox,
  checkVirusTotal,
  checkWebRisk,
  type ProviderResult,
} from "./providers.ts";

// ---- helpers ---------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function firstHeader(raw: string, name: string): string {
  const m = raw.match(new RegExp(`^${name}:\\s*(.*)$`, "im"));
  return m ? m[1].trim() : "";
}

function scoreToCategory(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 55) return "High Risk";
  if (score >= 30) return "Suspicious";
  return "Low Risk";
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const URGENCY = ["urgent", "immediately", "act now", "final notice", "account suspended", "verify now", "within 24 hours"];
const PAYMENT = ["wire transfer", "invoice", "payment", "gift card", "bank details", "bitcoin", "iban"];
const CREDENTIAL = ["password", "login", "sign in", "confirm your identity", "update your credentials"];

// ---- handler ---------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // --- Auth: build a client scoped to the caller so RLS applies to writes ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // --- Read the uploaded file (multipart/form-data, field "file") ---
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "No file provided" }, 400);
    if (!file.name.toLowerCase().endsWith(".eml")) {
      return json({ error: "Only .eml files are accepted" }, 400);
    }
    if (file.size > 10 * 1024 * 1024) {
      return json({ error: "File too large (max 10 MB)" }, 400);
    }

    // TEXT only — we never execute or render the file.
    const raw = await file.text();
    const fileHash = await sha256Hex(raw);

    // --- Store the file in the private bucket under the user's folder ---
    const filePath = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.eml`;
    // Do not fail the whole analysis if storage write fails; just note it.
    await supabase.storage
      .from("eml-files")
      .upload(filePath, new Blob([raw], { type: "message/rfc822" }), { upsert: false })
      .catch(() => undefined);

    // --- Extract basic fields (text parsing only) ---
    const from = firstHeader(raw, "From");
    const senderDomain = (from.match(/@([\w.-]+)/)?.[1] || null)?.toLowerCase() ?? null;
    const urls = Array.from(new Set((raw.match(/https?:\/\/[^\s"'<>)]+/gi) || [])
      .map((u) => u.replace(/[.,]$/, "")))).slice(0, 10);
    const ips = Array.from(new Set(raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [])).slice(0, 5);
    const sendingIp = ips[0] ?? null;

    const lower = raw.toLowerCase();
    const hasUrgency = URGENCY.some((w) => lower.includes(w));
    const hasPayment = PAYMENT.some((w) => lower.includes(w));
    const hasCredential = CREDENTIAL.some((w) => lower.includes(w));
    const brand = /(paypal|microsoft|apple|amazon|bank|google)/i.exec(from);
    const hasImpersonation = Boolean(brand && senderDomain && !senderDomain.includes(brand[1].toLowerCase()));

    const auth = {
      spf: lower.includes("spf=pass") ? "pass" : lower.includes("spf=fail") ? "fail" : "none",
      dkim: lower.includes("dkim=pass") ? "pass" : lower.includes("dkim=fail") ? "fail" : "none",
      dmarc: lower.includes("dmarc=pass") ? "pass" : lower.includes("dmarc=fail") ? "fail" : "none",
    };

    // --- Query providers (parallel). Missing keys => not_configured ---
    const providers: ProviderResult[] = await Promise.all([
      checkVirusTotal(urls),
      checkWebRisk(urls),
      checkAbuseIPDB(sendingIp),
      checkMaxMind(sendingIp),
      checkMXToolbox(senderDomain),
    ]);

    // --- Score ---
    let score = 0;
    if (hasUrgency) score += 14;
    if (hasPayment) score += 16;
    if (hasImpersonation) score += 24;
    if (hasCredential) score += 14;
    if (auth.spf !== "pass") score += 8;
    if (auth.dkim !== "pass") score += 8;
    if (auth.dmarc !== "pass") score += 10;
    score += providers.reduce((sum, p) => sum + (p.status === "ok" ? p.score : 0), 0);
    score = Math.max(0, Math.min(100, score));
    const category = scoreToCategory(score);

    // --- Build indicators ---
    const indicators: { type: string; value: string; severity: string; source: string; finding: string }[] = [];
    if (hasImpersonation) indicators.push({ type: "pattern", value: "impersonation", severity: "high", source: "AI Pattern Scan", finding: "Sender name impersonates a known brand." });
    if (hasUrgency) indicators.push({ type: "pattern", value: "urgency", severity: "medium", source: "AI Pattern Scan", finding: "Uses pressure to force quick action." });
    if (hasPayment) indicators.push({ type: "pattern", value: "payment-request", severity: "medium", source: "AI Pattern Scan", finding: "Requests a financial action." });
    if (hasCredential) indicators.push({ type: "pattern", value: "credential-request", severity: "medium", source: "AI Pattern Scan", finding: "Requests login credentials." });
    if (auth.dmarc !== "pass") indicators.push({ type: "header", value: "dmarc", severity: "medium", source: "Auth Check", finding: "DMARC did not pass." });
    if (indicators.length === 0) indicators.push({ type: "info", value: "clean", severity: "info", source: "AI Pattern Scan", finding: "No strong threat indicators found." });

    const recommendations = score >= 55
      ? ["Do NOT click any links or open attachments.", "Do NOT reply or share credentials/payment details.", "Report to your security/IT team.", "Delete after reporting."]
      : score >= 30
        ? ["Treat with caution; verify the sender via a known channel.", "Avoid clicking links.", "Do not share credentials or payment details."]
        : ["No strong threat signals detected, but stay alert.", "Verify unexpected requests independently."];

    const reportJson = {
      overallScore: score,
      riskCategory: category,
      providers,
      auth,
      urls: urls.map((u) => ({ url: u, domain: u.replace(/^https?:\/\//, "").split(/[/?#]/)[0], verdict: "unknown", note: "Listed only; never opened." })),
      ip: { ip: sendingIp, country: null, asn: null, isp: null, abuseScore: null },
      patterns: [
        { type: "urgency", detected: hasUrgency },
        { type: "payment_request", detected: hasPayment },
        { type: "impersonation", detected: hasImpersonation },
        { type: "credential_request", detected: hasCredential },
      ],
      recommendations,
    };

    // --- Persist (RLS ensures rows belong to this user) ---
    const nowIso = new Date().toISOString();
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .insert({
        user_id: userId,
        original_filename: file.name,
        file_path: filePath,
        file_hash: `sha256:${fileHash.slice(0, 24)}`,
        status: "completed",
        overall_score: score,
        risk_category: category,
        sender_domain: senderDomain,
        completed_at: nowIso,
      })
      .select()
      .single();
    if (scanErr || !scan) return json({ error: "Failed to save scan" }, 500);

    await supabase.from("scan_reports").insert({ scan_id: scan.id, report_json: reportJson });
    if (indicators.length) {
      await supabase.from("scan_indicators").insert(indicators.map((i) => ({ scan_id: scan.id, ...i })));
    }

    return json({ scan: { ...scan, report: reportJson } });
  } catch (_e) {
    // Do NOT include raw error details that might leak email content.
    return json({ error: "Analysis failed" }, 500);
  }
});
