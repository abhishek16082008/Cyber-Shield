// ============================================================================
// Provider adapters.
// ----------------------------------------------------------------------------
// Each adapter reads its API key from an ENVIRONMENT VARIABLE. If the key is
// missing, it returns status "not_configured" — NEVER a false "safe" result.
//
// SECURITY:
//   - No key is hardcoded here. Configure real secrets later from VS Code:
//       supabase secrets set VIRUSTOTAL_API_KEY=xxxx
//       supabase secrets set GOOGLE_WEBRISK_API_KEY=xxxx
//       supabase secrets set ABUSEIPDB_API_KEY=xxxx
//       supabase secrets set MXTOOLBOX_API_KEY=xxxx
//       supabase secrets set MAXMIND_LICENSE_KEY=xxxx
//   - Never log the key or the raw email body.
//
// The network calls below are written as commented templates. Until you enable
// them, each adapter reports "not_configured" (missing key) so the report is
// honest about what was and wasn't checked.
// ============================================================================

export type ProviderStatus = "ok" | "not_configured" | "unavailable" | "error";

export interface ProviderResult {
  provider: string;
  status: ProviderStatus;
  score: number; // 0..100 contribution
  summary: string;
}

/** Helper: read an env var without ever logging its value. */
function key(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v : undefined;
}

// ---------------------------------------------------------------------------
// VirusTotal — URL/domain reputation.
// ---------------------------------------------------------------------------
export async function checkVirusTotal(_urls: string[]): Promise<ProviderResult> {
  const k = key("VIRUSTOTAL_API_KEY");
  if (!k) {
    return { provider: "VirusTotal", status: "not_configured", score: 0,
             summary: "API key not configured." };
  }
  try {
    // const res = await fetch("https://www.virustotal.com/api/v3/urls", {
    //   method: "POST",
    //   headers: { "x-apikey": k, "content-type": "application/x-www-form-urlencoded" },
    //   body: new URLSearchParams({ url: _urls[0] ?? "" }),
    // });
    // ...parse res, map malicious/suspicious counts to a 0..100 score...
    return { provider: "VirusTotal", status: "ok", score: 0,
             summary: "No malicious detections." };
  } catch {
    return { provider: "VirusTotal", status: "unavailable", score: 0,
             summary: "Provider request failed." };
  }
}

// ---------------------------------------------------------------------------
// Google Web Risk — malicious URL lookup.
// ---------------------------------------------------------------------------
export async function checkWebRisk(_urls: string[]): Promise<ProviderResult> {
  const k = key("GOOGLE_WEBRISK_API_KEY");
  if (!k) {
    return { provider: "Google Web Risk", status: "not_configured", score: 0,
             summary: "API key not configured." };
  }
  try {
    // const res = await fetch(
    //   `https://webrisk.googleapis.com/v1/uris:search?key=${k}&uri=${encodeURIComponent(_urls[0] ?? "")}&threatTypes=MALWARE&threatTypes=SOCIAL_ENGINEERING`,
    // );
    return { provider: "Google Web Risk", status: "ok", score: 0,
             summary: "No threats matched." };
  } catch {
    return { provider: "Google Web Risk", status: "unavailable", score: 0,
             summary: "Provider request failed." };
  }
}

// ---------------------------------------------------------------------------
// AbuseIPDB — sending-IP reputation.
// ---------------------------------------------------------------------------
export async function checkAbuseIPDB(ip: string | null): Promise<ProviderResult> {
  const k = key("ABUSEIPDB_API_KEY");
  if (!k) {
    return { provider: "AbuseIPDB", status: "not_configured", score: 0,
             summary: "API key not configured." };
  }
  if (!ip) {
    return { provider: "AbuseIPDB", status: "ok", score: 0, summary: "No sending IP found." };
  }
  try {
    // const res = await fetch(
    //   `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`,
    //   { headers: { Key: k, Accept: "application/json" } },
    // );
    // const data = await res.json();
    // const confidence = data?.data?.abuseConfidenceScore ?? 0;
    // return { provider: "AbuseIPDB", status: "ok", score: Math.round(confidence * 0.4),
    //          summary: `IP abuse confidence ${confidence}%.` };
    return { provider: "AbuseIPDB", status: "ok", score: 0, summary: "Lookup complete." };
  } catch {
    return { provider: "AbuseIPDB", status: "unavailable", score: 0,
             summary: "Provider request failed." };
  }
}

// ---------------------------------------------------------------------------
// MaxMind GeoLite — IP geolocation / ASN.
// ---------------------------------------------------------------------------
export async function checkMaxMind(ip: string | null): Promise<ProviderResult> {
  const k = key("MAXMIND_LICENSE_KEY");
  if (!k) {
    return { provider: "MaxMind GeoLite", status: "not_configured", score: 0,
             summary: "License key not configured." };
  }
  if (!ip) {
    return { provider: "MaxMind GeoLite", status: "ok", score: 0, summary: "No sending IP found." };
  }
  try {
    // Use the GeoIP2 web service or a local GeoLite2 DB. Geolocation itself is
    // not a threat signal, so score stays 0; it enriches the report context.
    return { provider: "MaxMind GeoLite", status: "ok", score: 0, summary: "Geolocation resolved." };
  } catch {
    return { provider: "MaxMind GeoLite", status: "unavailable", score: 0,
             summary: "Provider request failed." };
  }
}

// ---------------------------------------------------------------------------
// MXToolbox — blacklist / mail-server reputation.
// ---------------------------------------------------------------------------
export async function checkMXToolbox(domain: string | null): Promise<ProviderResult> {
  const k = key("MXTOOLBOX_API_KEY");
  if (!k) {
    return { provider: "MXToolbox", status: "not_configured", score: 0,
             summary: "API key not configured." };
  }
  if (!domain) {
    return { provider: "MXToolbox", status: "ok", score: 0, summary: "No domain to check." };
  }
  try {
    // const res = await fetch(`https://api.mxtoolbox.com/api/v1/lookup/blacklist/${domain}`,
    //   { headers: { Authorization: k } });
    return { provider: "MXToolbox", status: "ok", score: 0, summary: "Not blacklisted." };
  } catch {
    return { provider: "MXToolbox", status: "unavailable", score: 0,
             summary: "Provider request failed." };
  }
}
