/* ==========================================================================
   AuthPage — Login / Sign-up / Forgot-password / Email-verification.
   Frontend validation + mock (or real Supabase) authentication.
   ========================================================================== */

import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, User as UserIcon, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ShieldLogo } from "@/components/ShieldLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";

type View = "auth" | "verify" | "forgot";

// Basic email pattern for frontend validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPage() {
  const { login, register, emailVerificationRequired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Where to return after login (set by ProtectedRoute).
  const from = (location.state as { from?: string })?.from || "/dashboard";

  const [view, setView] = useState<View>("auth");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // ---- Login submit ----
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Sign-up submit ----
  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (name.length < 2) return setError("Please enter your full name.");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setBusy(true);
    try {
      await register(name, email, password);
      setPendingEmail(email);
      setView("verify"); // show the email-verification placeholder
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <ShieldLogo size={64} />
          <div className="eyebrow mt-4">AurixCyber Airlines</div>
          <h1 className="mt-1 text-2xl font-bold">Cyber Shield</h1>
          <p className="text-sm text-muted-foreground">
            Secure sign-in to the email forensic platform
          </p>
        </div>

        <div className="panel reticle relative p-6">
          {/* ---------------- Email verification placeholder ---------------- */}
          {view === "verify" && (
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="size-12 text-secure" />
              <h2 className="mt-4 text-lg font-semibold">
                {emailVerificationRequired ? "Verify your email" : "Account created"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {emailVerificationRequired ? (
                  <>
                    We sent a verification link to{" "}
                    <span className="font-mono text-foreground">{pendingEmail}</span>. Open it
                    to activate your account, then log in.
                  </>
                ) : (
                  <>
                    Your account{" "}
                    <span className="font-mono text-foreground">{pendingEmail}</span> is ready.
                    Continue to log in.
                  </>
                )}
              </p>
              <Button className="mt-6 w-full" onClick={() => setView("auth")}>
                Continue to login
              </Button>
            </div>
          )}

          {/* -------------------- Forgot password -------------------- */}
          {view === "forgot" && (
            <div>
              <button
                onClick={() => setView("auth")}
                className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Back to login
              </button>
              <h2 className="text-lg font-semibold">Reset password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we'll send reset instructions.
              </p>
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setView("verify");
                }}
              >
                <Field id="fp-email" label="Email" icon={<Mail className="size-4" />}>
                  <Input id="fp-email" name="email" type="email" placeholder="you@company.com" required />
                </Field>
                <Button type="submit" className="w-full">
                  Send reset link
                </Button>
              </form>
            </div>
          )}

          {/* -------------------- Login / Sign-up tabs -------------------- */}
          {view === "auth" && (
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login">
                <form className="space-y-4" onSubmit={handleLogin}>
                  <Field id="login-email" label="Email" icon={<Mail className="size-4" />}>
                    <Input id="login-email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
                  </Field>
                  <Field id="login-password" label="Password" icon={<Lock className="size-4" />}>
                    <Input id="login-password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
                  </Field>
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="text-xs text-secure hover:underline"
                  >
                    Forgot password?
                  </button>
                  {error && <ErrorNote>{error}</ErrorNote>}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Authenticating…" : "Secure login"}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign up */}
              <TabsContent value="signup">
                <form className="space-y-4" onSubmit={handleSignup}>
                  <Field id="su-name" label="Full name" icon={<UserIcon className="size-4" />}>
                    <Input id="su-name" name="name" type="text" placeholder="Jane Analyst" autoComplete="name" required />
                  </Field>
                  <Field id="su-email" label="Email" icon={<Mail className="size-4" />}>
                    <Input id="su-email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
                  </Field>
                  <Field id="su-password" label="Password" icon={<Lock className="size-4" />}>
                    <Input id="su-password" name="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" required />
                  </Field>
                  <Field id="su-confirm" label="Confirm password" icon={<Lock className="size-4" />}>
                    <Input id="su-confirm" name="confirm" type="password" placeholder="Re-enter password" autoComplete="new-password" required />
                  </Field>
                  {error && <ErrorNote>{error}</ErrorNote>}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Creating account…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

/* --- Small presentational helpers --- */

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <div className="[&_input]:pl-9">{children}</div>
      </div>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-threat/30 bg-threat/10 px-3 py-2 text-sm text-threat" role="alert">
      {children}
    </div>
  );
}
