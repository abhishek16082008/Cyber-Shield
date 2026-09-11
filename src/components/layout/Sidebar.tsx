/* ==========================================================================
   Sidebar — fixed left navigation (desktop) / slide-in drawer (mobile).
   The ACTIVE item becomes visually LARGER and highlighted (per spec):
   a blue left-accent bar, brighter text, slightly larger icon + label.
   Instrument-panel styling: solid surface, hairline borders, mono wordmark.
   ========================================================================== */

import { NavLink } from "react-router-dom";
import { Lock } from "lucide-react";
import { ShieldLogo } from "@/components/ShieldLogo";
import { NAV_ITEMS } from "./nav";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Mobile drawer open state. */
  open: boolean;
  onNavigate: () => void; // called after a link click (closes the drawer)
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { user } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/80 md:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onNavigate}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[var(--sidebar-width)] flex-col border-r border-border bg-card",
          "transition-transform duration-200 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Primary navigation"
      >
        {/* ---- Logo / brand area ---- */}
        <div className="flex items-center gap-3 border-b border-border px-5 h-[var(--topbar-height)]">
          <ShieldLogo size={34} />
          <div className="leading-tight">
            <div className="font-mono text-sm font-bold uppercase tracking-[0.15em] text-foreground">
              Cyber Shield
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-secure">
              Email Protection
            </div>
          </div>
        </div>

        {/* ---- Nav items ---- */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="eyebrow px-3 pb-2 pt-1">navigate</div>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const locked = item.protected && !user;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                        "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        // ACTIVE: larger + highlighted with a left accent bar.
                        isActive &&
                          "bg-secondary text-foreground text-[15px] font-semibold pl-4",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Left accent bar shows only when active. */}
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-secure transition-all",
                            isActive ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden="true"
                        />
                        <item.icon
                          className={cn(
                            "shrink-0 transition-all",
                            isActive ? "size-5 text-secure" : "size-[18px]",
                          )}
                        />
                        <span>{item.label}</span>
                        {locked && (
                          <Lock className="ml-auto size-3.5 text-muted-foreground/60" />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ---- Footer status readout ---- */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-secure animate-pulse-glow" />
            {user ? "SESSION ACTIVE" : "NOT AUTHENTICATED"}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground/60">
            AurixCyber Airlines · v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
