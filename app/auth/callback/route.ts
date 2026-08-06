import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * OAuth redirect target for Supabase identity linking (e.g. Google Calendar connect).
 * Exchanges the PKCE `code` for a session, then persists the provider tokens
 * so server-side code (cron jobs, API routes) can call the Google Calendar API later.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}${next}?google_calendar=error`);
  }

  const { user, provider_token, provider_refresh_token } = data.session;

  if (!provider_token) {
    console.error("Google OAuth callback: session has no provider_token", {
      userId: user.id,
    });
    return NextResponse.redirect(`${origin}${next}?google_calendar=error&reason=no_provider_token`);
  }

  // Google access tokens are short-lived (~1h); without the refresh token we can't
  // compute a real expiry here, so it's left null until a refresh flow is wired up.
  const { error: upsertError } = await supabase.from("google_calendar_connections").upsert({
    user_id: user.id,
    access_token: provider_token,
    refresh_token: provider_refresh_token ?? null,
  });

  if (upsertError) {
    console.error("Google OAuth callback: failed to save connection", upsertError);
    return NextResponse.redirect(
      `${origin}${next}?google_calendar=error&reason=${encodeURIComponent(upsertError.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}?google_calendar=connected`);
}
