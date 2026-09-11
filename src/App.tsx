/* ==========================================================================
   App — routing + top-level providers.
   Routes:
     /auth                       Login / Sign-up (no shell)
     /                           Home         (public)
     /about                      About        (public)
     /analyse                    Analyse      (protected)
     /investigation              Investigation(protected)
     /reports                    Reports      (protected)
     /dashboard                  Dashboard    (protected)
   The animated splash overlays everything on first load of the session.
   ========================================================================== */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ScanProvider } from "@/context/ScanContext";
import { Splash } from "@/components/Splash";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { AuthPage } from "@/pages/AuthPage";
import { HomePage } from "@/pages/HomePage";
import { AnalysePage } from "@/pages/AnalysePage";
import { InvestigationPage } from "@/pages/InvestigationPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AboutPage } from "@/pages/AboutPage";

export default function App() {
  return (
    <AuthProvider>
      <ScanProvider>
        <BrowserRouter>
          {/* One-time animated welcome splash */}
          <Splash />

          <Routes>
            {/* Auth screen renders outside the app shell */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Everything else uses the sidebar + top bar shell */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />

              <Route
                path="/analyse"
                element={
                  <ProtectedRoute>
                    <AnalysePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/investigation"
                element={
                  <ProtectedRoute>
                    <InvestigationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Unknown routes -> home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ScanProvider>
    </AuthProvider>
  );
}
