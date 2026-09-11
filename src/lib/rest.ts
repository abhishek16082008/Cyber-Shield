/* ==========================================================================
   REST client for the custom FastAPI backend.
   --------------------------------------------------------------------------
   Handles the auth token (stored in localStorage) and JSON/multipart calls.
   Used whenever VITE_API_BASE_URL is set (see config.ts). If it isn't set,
   the app falls back to mock mode and this module is never called.
   ========================================================================== */

import { API_BASE_URL } from "./config";

const TOKEN_KEY = "cybershield.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Extract a human-readable error message from a failed response. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail[0]?.msg ?? "Request failed.";
    return data.message ?? "Request failed.";
  } catch {
    return `Request failed (${res.status}).`;
  }
}

/** JSON request with automatic Bearer auth. */
export async function apiJson<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Multipart file upload with Bearer auth (do NOT set Content-Type manually). */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body: form });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}
