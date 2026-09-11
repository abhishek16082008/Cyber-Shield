/* ==========================================================================
   ReportsPage — the full forensic report for one scan.
   Loads the scan by ?id= (shareable) or falls back to the most recent scan.
   Renders: threat gauge, provider bar chart, SPF/DKIM/DMARC, IP details,
   URL/domain findings, suspicious patterns, evidence table, recommendations,
   and a "Download PDF Report" button.
   ========================================================================== */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Download,
  ShieldCheck,
  ShieldX,
  MapPin,
  Link2,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ThreatGauge } from "@/components/ThreatGauge";
import { ProviderBarChart } from "@/components/ProviderBarChart";
import { getScan, listScans } from "@/lib/api";
import { downloadReport } from "@/lib/pdf";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import type {
  AuthCheck,
  PatternFinding,
  RiskCategory,
  Scan,
  Severity,
} from "@/lib/types";

/** Badge variant for a risk category. */
function riskVariant(cat: RiskCategory): "secure" | "warn" | "threat" {
  if (cat === "Low Risk") return "secure";
  if (cat === "Suspicious") return "warn";
  return "threat";
}

/** Badge variant for a severity. */
function sevVariant(sev: Severity): "secure" | "warn" | "threat" {
  if (sev === "info" || sev === "low") return "secure";
  if (sev === "medium") return "warn";
  return "threat";
}

export function ReportsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = params.get("id");

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      let result: Scan | null = null;
      if (id) {
        result = await getScan(user.id, id);
      } else {
        // No id -> show the most recent completed scan.
        const all = await listScans(user.id);
        result = all[0] ?? null;
      }
      if (active) {
        setScan(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/4 animate-loading-x bg-secure" />
        </div>
      </div>
    );
  }

  if (!scan || !scan.report) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <FileWarning className="size-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">No report to show</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Run an analysis to generate your first forensic report.
        </p>
        <Button className="mt-6" onClick={() => navigate("/analyse")}>
          Analyse an Email
        </Button>
      </div>
    );
  }

  const r = scan.report;

  return (
    <div className="space-y-6">
      {/* -------------------- Header -------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">forensic report</div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
            <span className="truncate">{scan.original_filename}</span>
            <Badge variant={riskVariant(r.riskCategory)}>{r.riskCategory}</Badge>
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>sender: {scan.sender_domain ?? "—"}</span>
            <span>scanned: {formatDate(scan.created_at)}</span>
            <span className="flex items-center gap-1">
              <Fingerprint className="size-3" /> {scan.file_hash}
            </span>
          </div>
        </div>
        <Button onClick={() => downloadReport(scan)}>
          <Download className="size-4" /> Download PDF Report
        </Button>
      </div>

      {/* -------------------- Score + chart -------------------- */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="panel reticle relative flex flex-col items-center justify-center p-6">
          <div className="eyebrow mb-4 self-start">threat score</div>
          <ThreatGauge score={r.overallScore} category={r.riskCategory} />
        </div>

        <div className="panel p-6">
          <div className="eyebrow mb-2">signal contribution by provider</div>
          <ProviderBarChart providers={r.providers} />
          <div className="mt-2 font-mono text-[11px] text-muted-foreground">
            Dimmed bars = provider not configured or unavailable. A missing key
            never counts as a "safe" result.
          </div>
        </div>
      </div>

      {/* -------------------- Auth + IP -------------------- */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Email authentication */}
        <div className="panel p-6">
          <div className="eyebrow mb-4">email authentication</div>
          <div className="grid grid-cols-3 gap-3">
            <AuthTile label="SPF" value={r.auth.spf} />
            <AuthTile label="DKIM" value={r.auth.dkim} />
            <AuthTile label="DMARC" value={r.auth.dmarc} />
          </div>
        </div>

        {/* IP details */}
        <div className="panel p-6">
          <div className="eyebrow mb-4">sending ip</div>
          <div className="space-y-2 text-sm">
            <KV label="IP address" value={<span className="mono">{r.ip.ip}</span>} />
            <KV
              label="Country"
              value={
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-secure" /> {r.ip.country}
                </span>
              }
            />
            <KV label="ASN" value={<span className="mono">{r.ip.asn}</span>} />
            <KV label="ISP" value={r.ip.isp} />
            <KV
              label="Abuse reputation"
              value={
                <Badge variant={r.ip.abuseScore > 50 ? "threat" : r.ip.abuseScore > 20 ? "warn" : "secure"}>
                  {r.ip.abuseScore}% confidence
                </Badge>
              }
            />
          </div>
        </div>
      </div>

      {/* -------------------- URLs + patterns -------------------- */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* URL & domain findings */}
        <div className="panel p-6">
          <div className="eyebrow mb-4">url &amp; domain findings</div>
          {r.urls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No URLs found in this email.</p>
          ) : (
            <ul className="space-y-3">
              {r.urls.map((u, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Link2
                    className={`mt-0.5 size-4 shrink-0 ${
                      u.verdict === "malicious" || u.verdict === "suspicious"
                        ? "text-threat"
                        : "text-secure"
                    }`}
                  />
                  <div className="min-w-0">
                    {/* URLs are shown as inert text — never a clickable link. */}
                    <div className="mono break-all text-sm text-foreground">{u.domain}</div>
                    <div className="text-xs text-muted-foreground">{u.note}</div>
                  </div>
                  <Badge
                    className="ml-auto shrink-0"
                    variant={
                      u.verdict === "clean" || u.verdict === "unknown" ? "secondary" : "threat"
                    }
                  >
                    {u.verdict}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            Links are listed as plain text and are never opened.
          </p>
        </div>

        {/* Suspicious patterns */}
        <div className="panel p-6">
          <div className="eyebrow mb-4">suspicious patterns</div>
          <ul className="space-y-2">
            {r.patterns.map((p) => (
              <PatternRow key={p.type} p={p} />
            ))}
          </ul>
        </div>
      </div>

      {/* -------------------- Evidence table -------------------- */}
      <div className="panel p-6">
        <div className="eyebrow mb-4">evidence</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Signal</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Finding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(r.indicators ?? []).map((ind) => (
              <TableRow key={ind.id}>
                <TableCell>
                  <Badge variant={sevVariant(ind.severity)}>{ind.severity}</Badge>
                </TableCell>
                <TableCell className="mono text-xs">{ind.type}</TableCell>
                <TableCell className="text-xs">{ind.source}</TableCell>
                <TableCell className="mono max-w-[160px] truncate text-xs">{ind.value}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{ind.finding}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* -------------------- Recommendations -------------------- */}
      <div className="panel reticle relative p-6">
        <div className="eyebrow mb-4">recommended safe actions</div>
        <ul className="space-y-2">
          {r.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secure" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* -------------------- small presentational helpers -------------------- */

function AuthTile({ label, value }: { label: string; value: AuthCheck[keyof AuthCheck] }) {
  const pass = value === "pass";
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-md border p-3 ${
        pass ? "border-secure/30 bg-secure/5" : "border-threat/30 bg-threat/5"
      }`}
    >
      {pass ? (
        <ShieldCheck className="size-5 text-secure" />
      ) : (
        <ShieldX className="size-5 text-threat" />
      )}
      <span className="font-mono text-xs font-semibold">{label}</span>
      <span className={`text-xs ${pass ? "text-secure" : "text-threat"}`}>{value}</span>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function PatternRow({ p }: { p: PatternFinding }) {
  const label = p.type.replace(/_/g, " ");
  return (
    <li className="flex items-start gap-3">
      {p.detected ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-threat" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secure" />
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium capitalize">
          {label}
          {p.detected && (
            <span className="ml-2 font-mono text-[10px] uppercase text-threat">detected</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{p.detail}</div>
      </div>
    </li>
  );
}
