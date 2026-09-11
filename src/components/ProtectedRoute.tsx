/* ==========================================================================
   ProtectedRoute — gates Analyse / Investigation / Reports / Dashboard.
   Redirects unauthenticated users to /auth and remembers where they were
   heading so we can send them back after login.
   ========================================================================== */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldLogo } from "@/components/ShieldLogo";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While restoring the session, show a small loading state (not a redirect).
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShieldLogo size={56} />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/4 animate-loading-x bg-secure" />
        </div>
      </div>
    );
  }

  if (!user) {
    // Send them to auth, preserving the intended destination.
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
