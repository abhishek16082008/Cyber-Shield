/* ==========================================================================
   Splash — animated welcome overlay: "Welcome to AurixCyber Airlines".
   Shows once per browser session (sessionStorage), then fades out.
   Uses the shield mark + a scanning progress bar; no external assets.
   ========================================================================== */

import { useEffect, useState } from "react";
import { ShieldLogo } from "@/components/ShieldLogo";

const SESSION_KEY = "cybershield.splash.shown";

export function Splash() {
  // Skip if we've already shown it this session.
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Hold, then fade out.
    const hold = setTimeout(() => setLeaving(true), 2200);
    const done = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 2800);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-label="Loading Cyber Shield"
    >
      <div className="animate-splash-in flex flex-col items-center">
        <ShieldLogo size={96} />
        <div className="eyebrow mt-6">AurixCyber Airlines</div>
        <h1 className="mt-2 text-center text-3xl font-extrabold tracking-tight md:text-4xl">
          Welcome to <span className="text-secure">AurixCyber Airlines</span>
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          Cyber Shield · Email Protection
        </p>

        {/* Scanning progress bar */}
        <div className="mt-8 h-1 w-64 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/4 animate-loading-x bg-secure" />
        </div>
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Initializing secure workspace
        </div>
      </div>
    </div>
  );
}
