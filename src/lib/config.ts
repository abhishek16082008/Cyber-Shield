/* ==========================================================================
   Central configuration — the ONE place to change backend URLs.
   --------------------------------------------------------------------------
   Nothing secret lives here. Only public values:
     - Supabase URL + anon key (public by design; RLS protects the data)
     - the API base URL for the analysis endpoints
   Real provider secrets (VirusTotal, AbuseIPDB, ...) live ONLY in the
   Supabase Edge Function secrets — never in the browser.
   ========================================================================== */

/** Supabase project URL (public). Empty string -> app runs in mock mode. */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

/** Supabase anon/publishable key (public, safe for the browser). */
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * Base URL for the analysis API.
 * Point this at your Supabase Edge Function or a FastAPI host.
 * Empty string -> the built-in mock analyzer is used so the UI works offline.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * API endpoint paths. These mirror the planned backend so the frontend is
 * ready to swap mock calls for real ones without touching the components.
 *
 *   POST /api/auth/login
 *   POST /api/auth/register
 *   POST /api/scans                -> create a scan (upload .eml)
 *   GET  /api/scans                -> list the current user's scans
 *   GET  /api/scans/{id}           -> one scan + its report
 *   GET  /api/scans/{id}/report.pdf-> download the PDF report
 */
export const ENDPOINTS = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  scans: "/api/scans",
  scan: (id: string) => `/api/scans/${id}`,
  reportPdf: (id: string) => `/api/scans/${id}/report.pdf`,
} as const;

/** Upload rules enforced in the UI (mirror the backend limits). */
export const UPLOAD = {
  allowedExtensions: [".eml"],
  maxBytes: 10 * 1024 * 1024, // 10 MB
} as const;

/** True when a real Supabase project has been configured via .env. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when a real analysis API base URL has been configured. */
export const isApiConfigured = Boolean(API_BASE_URL);
