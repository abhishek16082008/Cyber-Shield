/* ==========================================================================
   API service layer — the SINGLE place the UI talks to for scan data.
   Three modes, chosen automatically:
     1. REST     — custom FastAPI backend (VITE_API_BASE_URL set).
     2. SUPABASE — Supabase client + Edge Function (VITE_SUPABASE_* set).
     3. MOCK     — safe in-browser analysis + localStorage (no backend).
   Swapping backends requires NO component changes — just the .env values.
   ========================================================================== */

import { ENDPOINTS, isApiConfigured, isSupabaseConfigured } from "./config";
import { supabase } from "./supabase";
import { apiJson, apiUpload } from "./rest";
import { analyzeEml } from "./analyzer";
import { SEED_SCANS } from "@/data/mockData";
import type { Scan, ScanReport } from "./types";

/* ---------- mock storage helpers ---------- */
const storageKey = (userId: string) => `cybershield.scans.${userId}`;

function readLocal(userId: string): Scan[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw) as Scan[];
  } catch {
    /* ignore */
  }
  const seeded = SEED_SCANS.map((s) => ({ ...s, user_id: userId }));
  writeLocal(userId, seeded);
  return seeded;
}
function writeLocal(userId: string, scans: Scan[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(scans));
  } catch {
    /* ignore */
  }
}
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/* ---------- public API ---------- */

/** List the current user's scans (newest first). */
export async function listScans(userId: string): Promise<Scan[]> {
  if (isApiConfigured) {
    return apiJson<Scan[]>(ENDPOINTS.scans);
  }
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Scan[];
  }
  const scans = readLocal(userId);
  return [...scans].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Get one scan + its report. */
export async function getScan(userId: string, id: string): Promise<Scan | null> {
  if (isApiConfigured) {
    try {
      return await apiJson<Scan>(ENDPOINTS.scan(id));
    } catch {
      return null;
    }
  }
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("scans")
      .select("*, scan_reports(report_json)")
      .eq("id", id)
      .single();
    if (error) return null;
    const report = (data as { scan_reports?: { report_json: ScanReport }[] })
      .scan_reports?.[0]?.report_json;
    return { ...(data as Scan), report };
  }
  return readLocal(userId).find((s) => s.id === id) ?? null;
}

/** Upload a .eml and run analysis. `onStage` animates the Investigation view. */
export async function createScan(
  userId: string,
  file: File,
  onStage?: (stageIndex: number) => void,
): Promise<Scan> {
  if (isApiConfigured) {
    // Animate the timeline optimistically while the request is in flight.
    let stage = 0;
    const timer = setInterval(() => {
      if (stage < 9) onStage?.(stage++);
    }, 250);
    try {
      const scan = await apiUpload<Scan>(ENDPOINTS.scans, file);
      onStage?.(9);
      return scan;
    } finally {
      clearInterval(timer);
    }
  }

  if (isSupabaseConfigured && supabase) {
    let stage = 0;
    const timer = setInterval(() => {
      if (stage < 9) onStage?.(stage++);
    }, 250);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data, error } = await supabase.functions.invoke("analyze-email", { body: form });
      if (error) throw new Error(error.message);
      onStage?.(9);
      return (data as { scan: Scan }).scan;
    } finally {
      clearInterval(timer);
    }
  }

  // --- MOCK pipeline ---
  const text = await readFileText(file);
  for (let i = 0; i < 10; i++) {
    onStage?.(i);
    await new Promise((r) => setTimeout(r, 280));
  }
  const report = analyzeEml(file.name, text);
  const now = new Date().toISOString();
  const senderDomain = text.match(/@([\w.-]+)/)?.[1]?.toLowerCase() ?? null;
  const scan: Scan = {
    id: "scan-" + crypto.randomUUID().slice(0, 8),
    user_id: userId,
    original_filename: file.name,
    file_hash: "sha256:" + crypto.randomUUID().replace(/-/g, "").slice(0, 24),
    status: "completed",
    overall_score: report.overallScore,
    risk_category: report.riskCategory,
    sender_domain: senderDomain,
    created_at: now,
    completed_at: now,
    report,
  };
  const scans = readLocal(userId);
  scans.unshift(scan);
  writeLocal(userId, scans);
  return scan;
}

/** Delete a scan from history. */
export async function deleteScan(userId: string, id: string): Promise<void> {
  if (isApiConfigured) {
    await apiJson<void>(ENDPOINTS.scan(id), { method: "DELETE" });
    return;
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("scans").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const scans = readLocal(userId).filter((s) => s.id !== id);
  writeLocal(userId, scans);
}
