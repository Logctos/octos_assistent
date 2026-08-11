import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { AppSidebar } from "@/components/app-sidebar";
import { trackActivityForSleepSuggestion } from "@/lib/activity-tracker";

/** Gates /app, /despesas, /projetos, /saude behind auth — replaces proxy.ts's cookie-based redirect. */
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

  useEffect(() => {
    if (!user) return;
    return trackActivityForSleepSuggestion();
  }, [user]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen flex-1 flex-col font-inter md:flex-row">
      <AppSidebar userEmail={user.email} googleCalendarConnected={googleCalendarConnected} />
      <div className="hud-grid-bg flex flex-1 flex-col items-center gap-8 px-6 py-10">
        <Outlet />
      </div>
    </div>
  );
}
