/* ==========================================================================
   DashboardPage — the user's saved scan history.
   - Search by filename / sender domain.
   - Filter by risk level and by date range.
   - Table columns: filename, sender domain, scan date, score, status, action.
   - Actions: open the report, download PDF, delete.
   - "Future features" cards (view-only; v1 supports .eml upload only).
   ========================================================================== */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Eye,
  Trash2,
  FileText,
  ScanSearch,
  Sparkles,
  Boxes,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { listScans, deleteScan } from "@/lib/api";
import { downloadReport } from "@/lib/pdf";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import type { RiskCategory, Scan } from "@/lib/types";

const RISK_FILTERS: (RiskCategory | "All")[] = [
  "All",
  "Low Risk",
  "Suspicious",
  "High Risk",
  "Critical",
];

function riskVariant(cat: RiskCategory | null): "secure" | "warn" | "threat" | "secondary" {
  if (cat === "Low Risk") return "secure";
  if (cat === "Suspicious") return "warn";
  if (cat === "High Risk" || cat === "Critical") return "threat";
  return "secondary";
}

// Future-feature cards. NOTE: v1 only supports .eml upload, so we intentionally
// do NOT offer manual URL / IP / file scanning here.
const FUTURE = [
  { icon: Sparkles, title: "AI threat summaries", desc: "Plain-language explanations of each report, tuned for non-experts." },
  { icon: Boxes, title: "Team workspaces", desc: "Share reports and scan history securely across your security team." },
  { icon: Bell, title: "Alerting & webhooks", desc: "Get notified when a high-risk email is analysed in your org." },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<RiskCategory | "All">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function refresh() {
    if (!user) return;
    setLoading(true);
    setScans(await listScans(user.id));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Apply search + filters.
  const filtered = useMemo(() => {
    return scans.filter((s) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.original_filename.toLowerCase().includes(q) ||
        (s.sender_domain ?? "").toLowerCase().includes(q);
      const matchesRisk = risk === "All" || s.risk_category === risk;
      const time = new Date(s.created_at).getTime();
      const matchesFrom = !from || time >= new Date(from).getTime();
      const matchesTo = !to || time <= new Date(to).getTime() + 86_400_000; // inclusive day
      return matchesQuery && matchesRisk && matchesFrom && matchesTo;
    });
  }, [scans, query, risk, from, to]);

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this scan from your history? This cannot be undone.")) return;
    await deleteScan(user.id, id);
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">dashboard</div>
          <h1 className="mt-2 text-3xl font-bold">Scan History</h1>
          <p className="mt-1 text-muted-foreground">
            All emails you've analysed. Only you can see these.
          </p>
        </div>
        <Button onClick={() => navigate("/analyse")}>
          <ScanSearch className="size-4" /> New Analysis
        </Button>
      </div>

      {/* Filters */}
      <div className="panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          {/* Search */}
          <div className="space-y-1.5">
            <label className="eyebrow" htmlFor="search">search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                className="pl-9"
                placeholder="Filename or sender domain…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Date range */}
          <div className="flex gap-2">
            <div className="space-y-1.5">
              <label className="eyebrow" htmlFor="from">from</label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow" htmlFor="to">to</label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {/* Risk filter */}
          <div className="space-y-1.5">
            <span className="eyebrow">risk</span>
            <div className="flex flex-wrap gap-1">
              {RISK_FILTERS.map((rf) => (
                <button
                  key={rf}
                  onClick={() => setRisk(rf)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    risk === rf
                      ? "border-secure bg-secure/15 text-secure"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Sender domain</TableHead>
              <TableHead>Scan date</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <FileText className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No scans match your filters.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-[220px]">
                    <div className="truncate font-medium">{s.original_filename}</div>
                  </TableCell>
                  <TableCell className="mono text-xs text-muted-foreground">
                    {s.sender_domain ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(s.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="mono font-semibold">{s.overall_score ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={riskVariant(s.risk_category)}>
                      {s.risk_category ?? s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Open report"
                        onClick={() => navigate(`/reports?id=${s.id}`)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Download PDF"
                        onClick={() => downloadReport(s)}
                      >
                        <Download className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete"
                        onClick={() => handleDelete(s.id)}
                        className="text-threat hover:text-threat"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Future features */}
      <div>
        <div className="eyebrow mb-3">coming soon</div>
        <div className="grid gap-4 md:grid-cols-3">
          {FUTURE.map((f) => (
            <div key={f.title} className="panel p-5 opacity-80">
              <div className="flex size-10 items-center justify-center rounded-md border border-border bg-secondary text-secure">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-3 flex items-center gap-2 font-semibold">
                {f.title}
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  soon
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          v1 analyses uploaded .eml files only. Manual URL / IP / file scanning is
          intentionally not offered.
        </p>
      </div>
    </div>
  );
}
