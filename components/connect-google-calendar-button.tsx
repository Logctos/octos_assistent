"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ConnectGoogleCalendarButton({ connected }: { connected: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setIsLoading(true);
    setError(null);

    const supabase = getSupabaseClient();

    // A previous attempt may have linked the Google identity at the Supabase level
    // without us ever getting to save its token (e.g. our table didn't exist yet).
    // Supabase refuses to link the same identity twice, so clear it out first.
    const { data: identitiesData } = await supabase.auth.getUserIdentities();
    const staleGoogleIdentity = identitiesData?.identities.find((i) => i.provider === "google");

    if (staleGoogleIdentity) {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(staleGoogleIdentity);
      if (unlinkError) {
        setError(`Não foi possível limpar a conexão anterior: ${unlinkError.message}`);
        setIsLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}`,
        scopes: "https://www.googleapis.com/auth/calendar",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
    // On success the browser is redirected to Google's consent screen, so no further
    // local state update is needed here.
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]" />
          Google Agenda conectado
        </span>
        <button
          type="button"
          onClick={handleConnect}
          disabled={isLoading}
          className="text-xs text-zinc-500 underline decoration-dotted hover:text-[#0084FF] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Reconectando…" : "Reconectar"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={isLoading}
        className="hud-button rounded-sm px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Conectando…" : "Conectar Google Agenda"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
