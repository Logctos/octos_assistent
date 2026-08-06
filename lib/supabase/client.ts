import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client. Session is stored in cookies so the server/middleware can see it too. */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable"
    );
  }

  return createBrowserClient(url, publishableKey);
}
