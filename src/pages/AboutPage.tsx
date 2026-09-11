/* ==========================================================================
   AboutPage — mission, privacy promise, "how we protect data", contact.
   ========================================================================== */

import {
  Target,
  ShieldCheck,
  Lock,
  EyeOff,
  ServerCog,
  KeyRound,
  Trash2,
  Mail,
} from "lucide-react";
import { ShieldLogo } from "@/components/ShieldLogo";

const PROTECTIONS = [
  { icon: EyeOff, title: "No link execution", desc: "We never open URLs or load remote content from an email. Links are shown as inert text only." },
  { icon: ShieldCheck, title: "No attachment execution", desc: "Attachments are never run or rendered. Files are inspected as data, not executed." },
  { icon: Lock, title: "Owner-only reports", desc: "Every scan and report is private to the account that created it, enforced by row-level security." },
  { icon: KeyRound, title: "Secrets stay server-side", desc: "Provider API keys live only in secure server functions — never in your browser or this code." },
  { icon: ServerCog, title: "No false 'safe'", desc: "If a security provider isn't configured, we report 'not configured' — never a misleading safe result." },
  { icon: Trash2, title: "You control your data", desc: "Delete any scan from your history at any time. Uploaded files are stored in a private bucket." },
];

export function AboutPage() {
  return (
    <div className="space-y-10">
      {/* Mission */}
      <section>
        <div className="flex items-center gap-4">
          <ShieldLogo size={56} />
          <div>
            <div className="eyebrow">about</div>
            <h1 className="text-3xl font-bold">Cyber Shield</h1>
            <p className="text-sm text-muted-foreground">
              Email Protection · AurixCyber Airlines
            </p>
          </div>
        </div>

        <div className="panel reticle relative mt-6 p-6">
          <div className="mb-3 flex items-center gap-2 eyebrow">
            <Target className="size-4 text-secure" /> our mission
          </div>
          <p className="text-lg leading-relaxed">
            To make email threat analysis <span className="text-secure">safe, clear, and accessible</span>.
            Cyber Shield gives anyone the power to inspect a suspicious email
            without risk — turning confusing raw headers into a plain, scored
            forensic report, while guaranteeing that nothing dangerous is ever
            clicked, opened, or executed on your behalf.
          </p>
        </div>
      </section>

      {/* Privacy promise */}
      <section>
        <div className="eyebrow mb-2">privacy promise</div>
        <div className="panel border-secure/30 p-6">
          <p className="text-base leading-relaxed text-muted-foreground">
            Your emails are sensitive. We treat them that way. We do not sell your
            data, we do not use your email contents to train public models, and we
            never log raw email bodies, passwords, or secrets. Analysis runs in a
            controlled environment and results are visible only to you.
          </p>
        </div>
      </section>

      {/* How we protect data */}
      <section>
        <div className="eyebrow mb-3">how we protect your data</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROTECTIONS.map((p) => (
            <div key={p.title} className="panel p-5">
              <div className="flex size-10 items-center justify-center rounded-md border border-secure/30 bg-secure/10 text-secure">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-3 font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact placeholder */}
      <section>
        <div className="eyebrow mb-3">contact</div>
        <div className="panel flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Security or privacy questions?</h3>
            <p className="text-sm text-muted-foreground">
              Reach the AurixCyber security team. (Contact details are a
              placeholder — wire these up to your real support channel.)
            </p>
          </div>
          <a
            href="mailto:security@aurixcyber.example"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
          >
            <Mail className="size-4 text-secure" />
            security@aurixcyber.example
          </a>
        </div>
      </section>
    </div>
  );
}
