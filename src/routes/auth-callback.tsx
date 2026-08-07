import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * OAuth redirect target for Supabase identity linking (e.g. Google Calendar connect).
 * With the implicit flow, the SDK auto-parses the session (incl. provider_token) from the
 * URL hash during its own initialization — supabase.auth.getSession() awaits that init before
 * resolving, so calling it here reliably returns the freshly-linked session without us racing
 * an onAuthStateChange event or manually parsing the URL ourselves.
 */
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const next = searchParams.get("next") ?? "/";

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("Google OAuth callback: no session after redirect");
        navigate(`${next}?google_calendar=error&reason=no_session`, { replace: true });
        return;
      }

      const { user, provider_token, provider_refresh_token } = session;

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
