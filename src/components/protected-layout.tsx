import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";

/** Gates /app, /despesas, /projetos behind auth — replaces proxy.ts's cookie-based redirect. */
export function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("google_calendar_connections")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setGoogleCalendarConnected(Boolean(data)));
  }, [user]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="hud-grid-bg flex flex-1 flex-col items-center gap-8 px-6 py-10 font-inter">
      <AppHeader userEmail={user.email} googleCalendarConnected={googleCalendarConnected} />
      <div className="flex w-full flex-1 flex-col items-center">
        <Outlet />
      </div>
    </div>
  );
}
