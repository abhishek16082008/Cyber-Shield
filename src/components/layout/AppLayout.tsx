/* ==========================================================================
   AppLayout — the shell shared by every in-app page.
   Composes the fixed Sidebar + TopBar and renders the routed page in <main>.
   Handles the mobile drawer open/close state.
   ========================================================================== */

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <TopBar onMenuClick={() => setMenuOpen(true)} />

      {/* Content is offset by the sidebar (desktop) and the top bar (all sizes). */}
      <main className="md:ml-[var(--sidebar-width)] pt-[var(--topbar-height)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
