import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variable");
}

/**
 * Browser-only Supabase client. Session persists in localStorage — no cookies, no server.
 * Deliberately using the default 'implicit' flowType (not 'pkce'): Supabase's PKCE token
 * exchange (POST /token?grant_type=pkce) does not return provider_token/provider_refresh_token
 * in its response, so auth-callback.tsx would have no Google access token to save after linking
 * the Google Calendar identity. Implicit flow returns those directly in the redirect, which the
 * SDK auto-parses (detectSessionInUrl) — see auth-callback.tsx for how it's read back out.
 */
export const supabase = createClient(url, publishableKey);
