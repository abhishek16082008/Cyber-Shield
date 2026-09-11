/* ==========================================================================
   HomePage — product landing inside the app shell.
   - Floating AurixCyber brand mark in the background (CSS animation).
   - Clear product explanation.
   - Icon-based "How it works" (4 steps).
   - Primary CTA: "Analyse an Email".
   ========================================================================== */

import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  ScanSearch,
  FileText,
  Download,
  ShieldCheck,
  Lock,
  Plane,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShieldLogo } from "@/components/ShieldLogo";
import { useAuth } from "@/context/AuthContext";

const STEPS = [
  { icon: UploadCloud, title: "Upload .eml", desc: "Drop a suspicious email file. Only .eml is accepted." },
  { icon: ScanSearch, title: "Analyse indicators", desc: "Headers, URLs, IPs, auth and patterns are inspected — safely." },
  { icon: FileText, title: "Review forensic report", desc: "A 0–100 threat score with clear, explained evidence." },
  { icon: Download, title: "Download PDF", desc: "Export a shareable report for your records or team." },
];

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // CTA goes straight to Analyse if logged in, otherwise to auth first.
  const startAnalysis = () => navigate(user ? "/analyse" : "/auth");

  return (
    <div className="relative">
      {/* Floating brand marks in the background (decorative, aria-hidden). */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <Plane className="absolute left-[8%] top-[12%] size-24 text-secure/5 animate-float" />
        <ShieldLogo size={160} animated={false} className="absolute right-[6%] top-[20%] opacity-[0.06] animate-float" />
        <Plane className="absolute right-[24%] bottom-[8%] size-16 text-secure/5 animate-float" />
      </div>

      {/* -------------------- Hero -------------------- */}
      <section className="animate-fade-up py-8 md:py-14">
        <div className="eyebrow">defensive email forensics</div>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Know if an email is a{" "}
          <span className="text-threat">threat</span> — before you trust it.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          <span className="font-semibold text-foreground">Cyber Shield</span> by
          AurixCyber Airlines analyses suspicious <span className="mono text-secure">.eml</span>{" "}
          files and returns an AI-assisted forensic threat report. It never opens
          attachments and never visits links — analysis only.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={startAnalysis}>
            <ScanSearch className="size-5" /> Analyse an Email
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/about")}>
            How we protect your data <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Safety promises */}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-secure" /> Never executes attachments
          </span>
          <span className="flex items-center gap-2">
            <Lock className="size-4 text-secure" /> Never visits suspicious URLs
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-secure" /> Private, owner-only reports
          </span>
        </div>
      </section>

      {/* -------------------- How it works -------------------- */}
      <section className="py-8">
        <div className="eyebrow mb-4">how it works</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="panel relative p-5">
              {/* Step number as a mono readout */}
              <div className="absolute right-3 top-3 font-mono text-xs text-muted-foreground/50">
                0{i + 1}
              </div>
              <div className="flex size-11 items-center justify-center rounded-md border border-secure/30 bg-secure/10 text-secure">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------- Bottom CTA -------------------- */}
      <section className="panel reticle relative mt-6 flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Ready to inspect a suspicious email?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a <span className="mono text-secure">.eml</span> file and get a
            full forensic breakdown in seconds.
          </p>
        </div>
        <Button size="lg" onClick={startAnalysis}>
          <ScanSearch className="size-5" /> Start Secure Analysis
        </Button>
      </section>
    </div>
  );
}
