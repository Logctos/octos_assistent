import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variable");
}

/**
 * Browser-only Supabase client. Session persists in localStorage — no cookies, no server.
 * flowType 'pkce' is required so OAuth redirects (Google Calendar connect) land back on
 * /auth/callback with a `?code=` query param — the default 'implicit' flow puts the tokens
 * in the URL hash instead, which auth-callback.tsx never reads, silently dropping the
 * provider token before it's saved to google_calendar_connections.
 */
export const supabase = createClient(url, publishableKey, {
  auth: { flowType: "pkce" },
});
