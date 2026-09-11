// Shared CORS headers for browser -> Edge Function calls.
// Tighten `Access-Control-Allow-Origin` to your app's domain in production.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
