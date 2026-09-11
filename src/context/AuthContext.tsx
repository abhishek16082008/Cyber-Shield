/* ==========================================================================
   Authentication context.
   --------------------------------------------------------------------------
   Provides `useAuth()` to the whole app. Three modes, chosen automatically:
     - REST     : custom FastAPI backend (when VITE_API_BASE_URL is set).
     - SUPABASE : Supabase auth (when VITE_SUPABASE_* are set).
     - MOCK     : frontend-only auth in localStorage (no backend).
   The rest of the app just calls login / register / logout and reads `user`.
   ========================================================================== */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured, isApiConfigured } from "@/lib/config";
import { apiJson, getToken, setToken, clearToken } from "@/lib/rest";
import type { Profile } from "@/lib/types";

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  /** True when a real backend (REST or Supabase) is connected. */
  usingRealBackend: boolean;
  /** True only when sign-up requires clicking an email link (Supabase). */
  emailVerificationRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// --- Mock-mode storage helpers -------------------------------------------
const MOCK_USER_KEY = "cybershield.auth.user";
const MOCK_DB_KEY = "cybershield.auth.accounts";

interface MockAccount {
  id: string;
  full_name: string;
  email: string;
  password: string; // mock only — never store plaintext in production.
  created_at: string;
}

const readAccounts = (): MockAccount[] => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_DB_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeAccounts = (list: MockAccount[]) =>
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(list));

// --- REST response shapes -------------------------------------------------
interface RestUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}
interface RestToken {
  access_token: string;
  token_type: string;
  user: RestUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore any existing session on load.
  useEffect(() => {
    let active = true;

    async function init() {
      // ---- REST backend ----
      if (isApiConfigured) {
        if (getToken()) {
          try {
            const me = await apiJson<RestUser>("/api/auth/me");
            if (active) setUser(me);
          } catch {
            clearToken(); // token invalid/expired
          }
        }
        if (active) setLoading(false);
        return;
      }

      // ---- Supabase ----
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getUser();
        if (active && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email ?? "",
            full_name: (data.user.user_metadata?.full_name as string) ?? "",
            created_at: data.user.created_at ?? new Date().toISOString(),
          });
        }
        supabase.auth.onAuthStateChange((_e, session) => {
          if (!active) return;
          const u = session?.user;
          setUser(
            u
              ? {
                  id: u.id,
                  email: u.email ?? "",
                  full_name: (u.user_metadata?.full_name as string) ?? "",
                  created_at: u.created_at ?? new Date().toISOString(),
                }
              : null,
          );
        });
        if (active) setLoading(false);
        return;
      }

      // ---- Mock ----
      try {
        const raw = localStorage.getItem(MOCK_USER_KEY);
        if (active && raw) setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      if (active) setLoading(false);
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    if (isApiConfigured) {
      const data = await apiJson<RestToken>("/api/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setToken(data.access_token);
      setUser(data.user);
      return;
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return;
    }
    // Mock
    const acct = readAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!acct || acct.password !== password) throw new Error("Invalid email or password.");
    const profile: Profile = {
      id: acct.id,
      full_name: acct.full_name,
      email: acct.email,
      created_at: acct.created_at,
    };
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(profile));
    setUser(profile);
  };

  const register: AuthContextValue["register"] = async (name, email, password) => {
    if (isApiConfigured) {
      await apiJson<RestUser>("/api/auth/register", {
        method: "POST",
        body: { name, email, password },
        auth: false,
      });
      return; // no auto-login; the UI shows a "continue to login" step
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw new Error(error.message);
      return;
    }
    // Mock
    const accounts = readAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    accounts.push({
      id: "user-" + crypto.randomUUID().slice(0, 8),
      full_name: name,
      email,
      password,
      created_at: new Date().toISOString(),
    });
    writeAccounts(accounts);
  };

  const logout: AuthContextValue["logout"] = async () => {
    if (isApiConfigured) {
      clearToken();
    } else if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(MOCK_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        usingRealBackend: isApiConfigured || isSupabaseConfigured,
        emailVerificationRequired: isSupabaseConfigured && !isApiConfigured,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
