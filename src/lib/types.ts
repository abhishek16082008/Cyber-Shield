/* ==========================================================================
   Shared domain types for Cyber Shield.
   These mirror the planned database tables so the mock data and the real
   backend responses have the same shape.
   ========================================================================== */

/** Risk buckets shown throughout the UI. */
export type RiskCategory = "Low Risk" | "Suspicious" | "High Risk" | "Critical";

/** Lifecycle of a single scan. */
export type ScanStatus = "queued" | "analyzing" | "completed" | "failed";

/** How a security provider responded during analysis. */
export type ProviderStatus = "ok" | "not_configured" | "unavailable" | "error";

/** Severity used for indicators / evidence rows. */
export type Severity = "info" | "low" | "medium" | "high" | "critical";

/** A logged-in user's profile (mirrors `profiles` table). */
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

/** One provider's contribution to the overall score. */
export interface ProviderResult {
  provider: string; // e.g. "VirusTotal"
  status: ProviderStatus;
  score: number; // 0..100 contribution
  summary: string; // short human-readable note
}

/** Email authentication (SPF / DKIM / DMARC) result. */
export interface AuthCheck {
  spf: "pass" | "fail" | "softfail" | "none";
  dkim: "pass" | "fail" | "none";
  dmarc: "pass" | "fail" | "none";
}

/** Geolocation / reputation details for a sending IP. */
export interface IpDetail {
  ip: string;
  country: string;
  asn: string;
  isp: string;
  abuseScore: number; // 0..100 (AbuseIPDB style)
}

/** A URL or domain finding extracted from the email. */
export interface UrlFinding {
  url: string;
  domain: string;
  verdict: "clean" | "suspicious" | "malicious" | "unknown";
  note: string;
}

/** A suspicious-pattern finding (urgency, payment request, etc.). */
export interface PatternFinding {
  type:
    | "urgency"
    | "payment_request"
    | "impersonation"
    | "url_mismatch"
    | "credential_request";
  detected: boolean;
  detail: string;
}

/** A single evidence row (mirrors `scan_indicators`). */
export interface Indicator {
  id: string;
  type: string; // e.g. "url", "ip", "header", "pattern"
  value: string;
  severity: Severity;
  source: string; // provider or engine that found it
  finding: string; // human-readable explanation
}

/** The full forensic report (mirrors `scan_reports.report_json`). */
export interface ScanReport {
  overallScore: number; // 0..100
  riskCategory: RiskCategory;
  providers: ProviderResult[];
  auth: AuthCheck;
  ip: IpDetail;
  urls: UrlFinding[];
  patterns: PatternFinding[];
  indicators: Indicator[];
  recommendations: string[];
}

/** A scan record (mirrors `scans`), optionally with its report attached. */
export interface Scan {
  id: string;
  user_id: string;
  original_filename: string;
  file_hash: string;
  status: ScanStatus;
  overall_score: number | null;
  risk_category: RiskCategory | null;
  sender_domain: string | null;
  created_at: string;
  completed_at: string | null;
  report?: ScanReport;
}
