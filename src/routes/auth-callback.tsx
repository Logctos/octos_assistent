import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * OAuth redirect target for Supabase identity linking (e.g. Google Calendar connect).
 * Exchanges the PKCE `code` for a session, then persists the provider tokens so the
 * chat's create_calendar_event tool and the calendar panel can call the Google API later.
 */
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    if (!code) {
      navigate("/login?error=missing_code", { replace: true });
      return;
    }

    (async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session) {
        console.error("Google OAuth callback: exchangeCodeForSession failed", error);
        navigate(`${next}?google_calendar=error&reason=exchange_failed`, { replace: true });
        return;
      }

      const { user, provider_token, provider_refresh_token } = data.session;

      if (!provider_token) {
        console.error("Google OAuth callback: session has no provider_token", { userId: user.id });
        navigate(`${next}?google_calendar=error&reason=no_provider_token`, { replace: true });
        return;
      }

      const { error: upsertError } = await supabase.from("google_calendar_connections").upsert({
        user_id: user.id,
        access_token: provider_token,
        refresh_token: provider_refresh_token ?? null,
      });

      if (upsertError) {
        console.error("Google OAuth callback: failed to save connection", upsertError);
        navigate(
          `${next}?google_calendar=error&reason=${encodeURIComponent(upsertError.message)}`,
          { replace: true }
        );
        return;
      }

      navigate(`${next}?google_calendar=connected`, { replace: true });
    })();
  }, [searchParams, navigate]);

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <span className="loader" />
    </div>
  );
}
