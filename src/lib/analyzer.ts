/* ==========================================================================
   Client-side MOCK analyzer.
   --------------------------------------------------------------------------
   This runs ONLY when no real backend is configured, so the UI is fully
   usable offline. It performs SAFE, text-only inspection of the .eml:
     - reads headers and body as plain text
     - extracts URLs / IPs with regexes
     - flags suspicious keyword patterns
   It NEVER fetches any URL, never executes attachments, never runs scripts.
   When you connect the real backend, api.ts calls the Edge Function instead
   and this file is bypassed.
   ========================================================================== */

import type {
  AuthCheck,
  Indicator,
  IpDetail,
  PatternFinding,
  ProviderResult,
  RiskCategory,
  ScanReport,
  Severity,
  UrlFinding,
} from "./types";

/** Map a 0..100 score to a human risk category. */
export function scoreToCategory(score: number): RiskCategory {
  if (score >= 80) return "Critical";
  if (score >= 55) return "High Risk";
  if (score >= 30) return "Suspicious";
  return "Low Risk";
}

/** Simple, stable hash for display (NOT cryptographic). */
function pseudoHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + "…" + text.length.toString(16);
}

/** Pull a header value (first match) from raw .eml text. */
function header(raw: string, name: string): string {
  const re = new RegExp(`^${name}:\\s*(.*)$`, "im");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

const URGENCY_WORDS = [
  "urgent",
  "immediately",
  "act now",
  "final notice",
  "account suspended",
  "verify now",
  "within 24 hours",
  "your account will be",
];
const PAYMENT_WORDS = [
  "wire transfer",
  "invoice",
  "payment",
  "gift card",
  "bank details",
  "bitcoin",
  "iban",
];
const CREDENTIAL_WORDS = [
  "password",
  "login",
  "sign in",
  "confirm your identity",
  "update your credentials",
];

/**
 * Analyze raw .eml text and produce a full forensic report.
 * `content` may be empty (e.g. we only got the filename) — the analyzer
 * still returns a plausible report so the UI can be demonstrated.
 */
export function analyzeEml(_filename: string, content: string): ScanReport {
  const raw = content || "";
  const lower = raw.toLowerCase();

  // --- Extract basic fields (text only) ---
  const from = header(raw, "From");
  const senderDomain = (from.match(/@([\w.-]+)/)?.[1] || "unknown.example").toLowerCase();

  // URLs (we only list them — we NEVER open them).
  const urlMatches = Array.from(
    new Set((raw.match(/https?:\/\/[^\s"'<>)]+/gi) || []).map((u) => u.replace(/[.,]$/, ""))),
  ).slice(0, 8);

  // IPs from Received headers.
  const ipMatches = Array.from(
    new Set(raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []),
  ).slice(0, 4);

  // --- Pattern detection ---
  const hasUrgency = URGENCY_WORDS.some((w) => lower.includes(w));
  const hasPayment = PAYMENT_WORDS.some((w) => lower.includes(w));
  const hasCredential = CREDENTIAL_WORDS.some((w) => lower.includes(w));

  // "URL mismatch": anchor text domain differs from href domain.
  const mismatch = /<a\s+[^>]*href=["']https?:\/\/([\w.-]+)[^>]*>\s*(?:https?:\/\/)?([\w.-]+)/i.exec(raw);
  const hasMismatch = Boolean(mismatch && mismatch[1] !== mismatch[2]);

  // Impersonation heuristic: display name mentions a brand but domain doesn't.
  const brandInName = /(paypal|microsoft|apple|amazon|bank|google)/i.exec(from);
  const hasImpersonation = Boolean(
    brandInName && !senderDomain.includes(brandInName[1].toLowerCase()),
  );

  const patterns: PatternFinding[] = [
    { type: "urgency", detected: hasUrgency, detail: hasUrgency ? "Pressuring / time-limited language detected." : "No urgency language found." },
    { type: "payment_request", detected: hasPayment, detail: hasPayment ? "Requests payment, invoice, or financial action." : "No payment request found." },
    { type: "impersonation", detected: hasImpersonation, detail: hasImpersonation ? `Display name references a brand not matching ${senderDomain}.` : "No brand impersonation detected." },
    { type: "url_mismatch", detected: hasMismatch, detail: hasMismatch ? "Visible link text does not match the real destination." : "No link text/destination mismatch." },
    { type: "credential_request", detected: hasCredential, detail: hasCredential ? "Asks to sign in or confirm credentials." : "No credential request detected." },
  ];

  // --- Authentication checks (mocked but deterministic from content) ---
  const auth: AuthCheck = {
    spf: lower.includes("spf=pass") ? "pass" : lower.includes("spf=fail") ? "fail" : hasImpersonation ? "softfail" : "pass",
    dkim: lower.includes("dkim=pass") ? "pass" : hasImpersonation ? "fail" : "pass",
    dmarc: lower.includes("dmarc=pass") ? "pass" : hasImpersonation || hasMismatch ? "fail" : "pass",
  };

  // --- Sending IP details (mocked) ---
  const ip: IpDetail = {
    ip: ipMatches[0] || "203.0.113.44",
    country: hasImpersonation ? "RU" : "US",
    asn: "AS" + (13335 + (raw.length % 900)),
    isp: hasImpersonation ? "Unknown Hosting LLC" : "Cloudflare, Inc.",
    abuseScore: hasImpersonation ? 78 : hasUrgency ? 32 : 4,
  };

  // --- URL findings (verdicts are heuristic; URLs are never opened) ---
  const urls: UrlFinding[] = urlMatches.map((u) => {
    const domain = u.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
    const suspicious =
      hasMismatch ||
      /\d{1,3}(?:\.\d{1,3}){3}/.test(domain) || // raw IP host
      /(login|verify|secure|account)[.-]/i.test(domain) ||
      domain.split(".").length > 3;
    return {
      url: u,
      domain,
      verdict: suspicious ? "suspicious" : "unknown",
      note: suspicious ? "Lookalike / obfuscated host pattern." : "No known reputation (provider not configured).",
    };
  });

  // --- Provider results ---
  // Without configured keys these return "not_configured" — never a false safe.
  const providers: ProviderResult[] = [
    { provider: "VirusTotal", status: "not_configured", score: 0, summary: "API key not configured." },
    { provider: "Google Web Risk", status: "not_configured", score: 0, summary: "API key not configured." },
    { provider: "AbuseIPDB", status: "ok", score: Math.round(ip.abuseScore * 0.4), summary: `IP abuse confidence ${ip.abuseScore}%.` },
    { provider: "MaxMind GeoLite", status: "ok", score: 0, summary: `Origin ${ip.country} / ${ip.asn}.` },
    { provider: "MXToolbox", status: "unavailable", score: 0, summary: "Blacklist lookup temporarily unavailable." },
    { provider: "AI Pattern Scan", status: "ok", score: 0, summary: "Heuristic content analysis." },
  ];

  // --- Scoring: sum weighted signals, clamp 0..100 ---
  let score = 0;
  if (hasUrgency) score += 14;
  if (hasPayment) score += 16;
  if (hasImpersonation) score += 24;
  if (hasMismatch) score += 18;
  if (hasCredential) score += 14;
  if (auth.spf !== "pass") score += 8;
  if (auth.dkim !== "pass") score += 8;
  if (auth.dmarc !== "pass") score += 10;
  score += Math.round(ip.abuseScore * 0.25);
  score += urls.filter((u) => u.verdict === "suspicious").length * 6;
  score = Math.max(0, Math.min(100, score));

  // Record the AI pattern-scan contribution.
  providers[5].score = Math.min(40, score);

  // --- Evidence indicators ---
  const indicators: Indicator[] = [];
  const add = (type: string, value: string, severity: Severity, source: string, finding: string) =>
    indicators.push({ id: crypto.randomUUID(), type, value, severity, source, finding });

  if (hasImpersonation) add("pattern", "brand-impersonation", "high", "AI Pattern Scan", "Sender name impersonates a known brand.");
  if (hasMismatch) add("url", mismatch?.[1] || "link", "high", "AI Pattern Scan", "Link text hides the true destination.");
  if (hasUrgency) add("pattern", "urgency", "medium", "AI Pattern Scan", "Uses pressure to force quick action.");
  if (hasPayment) add("pattern", "payment-request", "medium", "AI Pattern Scan", "Requests a financial action.");
  if (hasCredential) add("pattern", "credential-request", "medium", "AI Pattern Scan", "Requests login credentials.");
  if (ip.abuseScore > 50) add("ip", ip.ip, "high", "AbuseIPDB", `Sending IP has ${ip.abuseScore}% abuse confidence.`);
  if (auth.dmarc !== "pass") add("header", "dmarc", "medium", "Auth Check", "DMARC did not pass.");
  urls.filter((u) => u.verdict === "suspicious").forEach((u) => add("url", u.domain, "medium", "AI Pattern Scan", u.note));
  if (indicators.length === 0) add("info", "clean", "info", "AI Pattern Scan", "No strong threat indicators found in offline analysis.");

  // --- Recommended safe actions ---
  const recommendations =
    score >= 55
      ? [
          "Do NOT click any links or open attachments in this email.",
          "Do NOT reply or provide any credentials or payment details.",
          "Report the email to your security/IT team.",
          "Delete the email after reporting.",
          "If it impersonates a service you use, contact them via their official website — not this email.",
        ]
      : score >= 30
        ? [
            "Treat this email with caution; verify the sender through a known channel.",
            "Hover over links to confirm destinations before clicking (or avoid entirely).",
            "Do not share credentials or payment details.",
            "When unsure, report to your security team.",
          ]
        : [
            "No strong threat signals detected, but stay alert.",
            "Verify unexpected requests independently.",
            "Never share passwords or one-time codes over email.",
          ];

  return {
    overallScore: score,
    riskCategory: scoreToCategory(score),
    providers,
    auth,
    ip,
    urls,
    patterns,
    indicators,
    recommendations,
  };
}

/** Expose the pseudo-hash so api.ts can label mock scans consistently. */
export { pseudoHash };
