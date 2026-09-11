/* ==========================================================================
   TopBar — fixed top navigation.
   Left: mobile menu toggle + current section label (mono readout).
   Right: login button (logged out) or profile dropdown menu (logged in).
   ========================================================================== */

import { useNavigate, useLocation } from "react-router-dom";
import { Menu, User, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS } from "./nav";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Human label for the current route (shown as a mono readout).
  const current =
    NAV_ITEMS.find((n) => n.to === location.pathname)?.label ??
    (location.pathname.startsWith("/reports") ? "Reports" : "Cyber Shield");

  return (
    <header className="fixed top-0 right-0 left-0 z-20 flex h-[var(--topbar-height)] items-center gap-3 border-b border-border bg-card/95 px-4 md:left-[var(--sidebar-width)]">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Section readout */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-secure" />
        <span className="font-mono text-sm uppercase tracking-[0.15em] text-foreground">
          {current}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Live "safe mode" indicator — reinforces the defensive posture. */}
        <span className="hidden items-center gap-2 rounded border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground sm:flex">
          <span className="size-1.5 rounded-full bg-secure" />
          SAFE MODE · NO LINKS OPENED
        </span>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 hover:bg-secondary"
                aria-label="Account menu"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-secure/15 text-secure">
                  <User className="size-4" />
                </span>
                <span className="hidden max-w-[140px] truncate text-sm md:inline">
                  {user.full_name || user.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="truncate">
                {user.full_name || "Account"}
                <div className="font-normal text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="size-4" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
                className="text-threat focus:text-threat"
              >
                <LogOut className="size-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" onClick={() => navigate("/auth")}>
            <User className="size-4" /> Login
          </Button>
        )}
      </div>
    </header>
  );
}
