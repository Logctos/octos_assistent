import { AppHeader } from "@/components/app-header";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let googleCalendarConnected = false;
  if (user) {
    const { data } = await supabase
      .from("google_calendar_connections")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    googleCalendarConnected = Boolean(data);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-white px-6 py-10 font-inter">
      <AppHeader userEmail={user?.email} googleCalendarConnected={googleCalendarConnected} />
      <div className="flex w-full flex-1 flex-col items-center">{children}</div>
    </div>
  );
}
