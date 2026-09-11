/* ==========================================================================
   Report export ("Download PDF Report").
   --------------------------------------------------------------------------
   We render a clean, print-friendly HTML report in a new window and trigger
   the browser's print dialog, where the user chooses "Save as PDF". This keeps
   the project dependency-free (no PDF library) and works in both mock and real
   modes, since the report data is always attached to the scan.

   When the custom REST backend is connected, we instead open its
   server-generated PDF endpoint (which returns a real .pdf file).
   ========================================================================== */

import { API_BASE_URL, ENDPOINTS, isApiConfigured } from "./config";
import { getToken } from "./rest";
import type { Scan } from "./types";

/** Escape user/content text before injecting into the print HTML. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

/** Build a standalone, printable HTML document for a scan report. */
function renderReportHtml(scan: Scan): string {
  const r = scan.report;
  if (!r) return "<p>No report available.</p>";

  const rows = r.indicators
    .map(
      (i) =>
        `<tr><td>${esc(i.severity)}</td><td>${esc(i.type)}</td><td>${esc(i.source)}</td><td>${esc(i.value)}</td><td>${esc(i.finding)}</td></tr>`,
    )
    .join("");

  const recs = r.recommendations.map((x) => `<li>${esc(x)}</li>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Cyber Shield Report — ${esc(scan.original_filename)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color:#111; margin:32px; }
  h1 { color:#0369a1; margin-bottom:4px; }
  .muted { color:#555; font-size:12px; }
  .score { font-size:48px; font-weight:800; }
  .cat { display:inline-block; padding:4px 12px; border-radius:6px; color:#fff; font-weight:700; }
  table { width:100%; border-collapse:collapse; margin-top:8px; font-size:12px; }
  th,td { border:1px solid #ccc; padding:6px 8px; text-align:left; vertical-align:top; }
  th { background:#f1f5f9; }
  section { margin-top:24px; }
  .grid { display:flex; gap:24px; flex-wrap:wrap; }
  .kv { font-size:13px; }
  @media print { .no-print { display:none; } }
</style></head><body>
  <h1>Cyber Shield — Forensic Email Report</h1>
  <div class="muted">AurixCyber Airlines · Defensive Email Protection · Generated ${new Date().toLocaleString()}</div>

  <section class="grid">
    <div>
      <div class="muted">Overall threat score</div>
      <div class="score">${r.overallScore}<span style="font-size:20px">/100</span></div>
      <span class="cat" style="background:${categoryColor(r.riskCategory)}">${esc(r.riskCategory)}</span>
    </div>
    <div class="kv">
      <div><b>File:</b> ${esc(scan.original_filename)}</div>
      <div><b>Sender domain:</b> ${esc(scan.sender_domain || "—")}</div>
      <div><b>Hash:</b> ${esc(scan.file_hash)}</div>
      <div><b>SPF:</b> ${esc(r.auth.spf)} · <b>DKIM:</b> ${esc(r.auth.dkim)} · <b>DMARC:</b> ${esc(r.auth.dmarc)}</div>
      <div><b>Sending IP:</b> ${esc(r.ip.ip)} (${esc(r.ip.country)}, ${esc(r.ip.isp)}, abuse ${r.ip.abuseScore}%)</div>
    </div>
  </section>

  <section>
    <h3>Evidence</h3>
    <table>
      <thead><tr><th>Severity</th><th>Signal</th><th>Provider</th><th>Value</th><th>Finding</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section>
    <h3>Recommended safe actions</h3>
    <ul>${recs}</ul>
  </section>

  <div class="no-print muted" style="margin-top:32px">
    Tip: choose "Save as PDF" in the print dialog to download this report.
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body></html>`;
}

function categoryColor(cat: string): string {
  switch (cat) {
    case "Critical":
      return "#b91c1c";
    case "High Risk":
      return "#dc2626";
    case "Suspicious":
      return "#d97706";
    default:
      return "#0369a1";
  }
}

/** Download / open the PDF report for a scan. */
export function downloadReport(scan: Scan): void {
  // REST backend: open the server-generated PDF (token passed as query param
  // because a new tab can't send an Authorization header).
  if (isApiConfigured) {
    const token = getToken() ?? "";
    const url = `${API_BASE_URL}${ENDPOINTS.reportPdf(scan.id)}?token=${encodeURIComponent(token)}`;
    window.open(url, "_blank", "noopener");
    return;
  }

  // Otherwise render a printable report window; the user chooses "Save as PDF".
  const win = window.open("", "_blank", "noopener,width=900,height=1000");
  if (!win) {
    alert("Please allow pop-ups to download the PDF report.");
    return;
  }
  win.document.write(renderReportHtml(scan));
  win.document.close();
}
