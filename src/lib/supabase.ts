/* ==========================================================================
   Supabase client.
   --------------------------------------------------------------------------
   Creates a browser Supabase client ONLY if a URL + anon key are configured
   in .env. Otherwise it exports `null` and the app falls back to mock mode.
   The anon key is public by design — never place service_role keys here.
   ========================================================================== */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
