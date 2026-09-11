/* ==========================================================================
   InvestigationPage — animated forensic pipeline.
   Shows the analysis "route" as a timeline of stages with moving scan lines,
   status chips and realistic loading states. Supports three visual outcomes
   per stage: success, API unavailable, and scan failed.
   When the pipeline finishes it navigates to the Reports view.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  ListTree,
  ShieldCheck,
  Bug,
  Globe,
  Network,
  MapPin,
  Server,
  Brain,
  Gauge,
  Loader2,
  Check,
  AlertTriangle,
  XCircle,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useScan } from "@/context/ScanContext";
import { createScan } from "@/lib/api";
import type { ProviderStatus } from "@/lib/types";

/** Pipeline stages, in order. `expected` sets the resolved visual state. */
const STAGES: { label: string; icon: typeof Mail; expected: ProviderStatus }[] = [
  { label: "Parse email", icon: Mail, expected: "ok" },
  { label: "Extract headers / URLs / IPs", icon: ListTree, expected: "ok" },
  { label: "Authentication checks (SPF/DKIM/DMARC)", icon: ShieldCheck, expected: "ok" },
  { label: "VirusTotal", icon: Bug, expected: "not_configured" },
  { label: "Google Web Risk", icon: Globe, expected: "not_configured" },
  { label: "AbuseIPDB", icon: Network, expected: "ok" },
  { label: "MaxMind GeoLite", icon: MapPin, expected: "ok" },
  { label: "MXToolbox", icon: Server, expected: "unavailable" },
  { label: "AI pattern scan", icon: Brain, expected: "ok" },
  { label: "Final risk score", icon: Gauge, expected: "ok" },
];

type Outcome = "running" | "done" | "error";

export function InvestigationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pendingFile, setPendingFile } = useScan();

  const [current, setCurrent] = useState(-1); // index of the running stage
  const [outcome, setOutcome] = useState<Outcome>("running");
  const startedRef = useRef(false); // guard against React 18 double-invoke

  useEffect(() => {
    if (!pendingFile || !user) return;
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const scan = await createScan(user.id, pendingFile, (i) => setCurrent(i));
        setCurrent(STAGES.length); // mark all done
        setOutcome("done");
        setPendingFile(null);
        // Small beat so the "complete" state is visible before navigating.
        setTimeout(() => navigate(`/reports?id=${scan.id}`), 700);
      } catch {
        setOutcome("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Empty state: user landed here without uploading ----
  if (!pendingFile && outcome === "running") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <ScanSearch className="size-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">No email queued for analysis</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Upload a <span className="mono text-secure">.eml</span> file on the Analyse
          screen to start a secure investigation.
        </p>
        <Button className="mt-6" onClick={() => navigate("/analyse")}>
          <ScanSearch className="size-4" /> Go to Analyse
        </Button>
      </div>
    );
  }

  const progress = Math.min(100, Math.round((Math.max(current, 0) / STAGES.length) * 100));

  return (
    <div>
      <div className="eyebrow">investigation</div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Forensic Investigation</h1>
          <p className="mt-1 text-muted-foreground">
            Tracing the email's route through each analysis stage.
          </p>
        </div>
        <div className="font-mono text-sm text-muted-foreground">
          {outcome === "error" ? (
            <span className="text-threat">SCAN FAILED</span>
          ) : outcome === "done" ? (
            <span className="text-secure">ANALYSIS COMPLETE</span>
          ) : (
            <span>{progress}% · SCANNING…</span>
          )}
        </div>
      </div>

      {/* Progress bar with a moving scan sweep */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        {outcome === "error" ? (
          <div className="h-full w-full bg-threat/60" />
        ) : (
          <div
            className="h-full bg-secure transition-all duration-300"
            style={{ width: `${outcome === "done" ? 100 : progress}%` }}
          />
        )}
      </div>

      {/* ---- Scan-failed banner ---- */}
      {outcome === "error" && (
        <div className="panel mt-6 flex items-center justify-between border-threat/30 bg-threat/10 p-4">
          <div className="flex items-center gap-3 text-threat">
            <XCircle className="size-5" />
            <div>
              <div className="font-semibold">Scan failed</div>
              <div className="text-sm text-threat/80">
                The email could not be analysed. Please try uploading it again.
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/analyse")}>
            Retry
          </Button>
        </div>
      )}

      {/* -------------------- Timeline -------------------- */}
      <ol className="relative mt-8 space-y-3 border-l border-border pl-6">
        {STAGES.map((stage, i) => {
          const state =
            outcome === "error" && i >= current
              ? "failed"
              : i < current || outcome === "done"
                ? "resolved"
                : i === current
                  ? "running"
                  : "pending";

          return (
            <li key={stage.label} className="relative">
              {/* Node dot on the route line */}
              <span
                className={`absolute -left-[31px] top-3 flex size-4 items-center justify-center rounded-full border-2 ${
                  state === "resolved"
                    ? "border-secure bg-secure"
                    : state === "running"
                      ? "border-secure bg-background"
                      : state === "failed"
                        ? "border-threat bg-threat"
                        : "border-border bg-background"
                }`}
              >
                {state === "running" && (
                  <span className="size-2 animate-ping rounded-full bg-secure" />
                )}
              </span>

              {/* Stage row */}
              <div
                className={`panel relative overflow-hidden p-4 transition-colors ${
                  state === "running" ? "border-secure/40" : ""
                }`}
              >
                {/* Moving scan line while running */}
                {state === "running" && (
                  <div className="scanline top-0 animate-scan" aria-hidden="true" />
                )}

                <div className="flex items-center gap-3">
                  <stage.icon
                    className={`size-5 shrink-0 ${
                      state === "resolved"
                        ? "text-secure"
                        : state === "running"
                          ? "text-secure"
                          : state === "failed"
                            ? "text-threat"
                            : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`flex-1 text-sm font-medium ${
                      state === "pending" ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {stage.label}
                  </span>

                  {/* Status chip */}
                  <StatusChip state={state} expected={stage.expected} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---- Status chip for a single stage ---- */
function StatusChip({
  state,
  expected,
}: {
  state: "resolved" | "running" | "pending" | "failed";
  expected: ProviderStatus;
}) {
  if (state === "pending")
    return <Chip className="text-muted-foreground border-border">queued</Chip>;

  if (state === "running")
    return (
      <Chip className="border-secure/40 text-secure">
        <Loader2 className="size-3 animate-spin" /> scanning
      </Chip>
    );

  if (state === "failed")
    return (
      <Chip className="border-threat/40 text-threat">
        <XCircle className="size-3" /> failed
      </Chip>
    );

  // resolved -> reflect the provider's real state
  if (expected === "not_configured")
    return (
      <Chip className="border-warn/40 text-warn">
        <AlertTriangle className="size-3" /> not configured
      </Chip>
    );
  if (expected === "unavailable")
    return (
      <Chip className="border-warn/40 text-warn">
        <AlertTriangle className="size-3" /> unavailable
      </Chip>
    );
  return (
    <Chip className="border-secure/40 text-secure">
      <Check className="size-3" /> ok
    </Chip>
  );
}

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] ${className}`}
    >
      {children}
    </span>
  );
}
