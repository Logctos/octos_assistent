import { ChatPanel } from "@/components/chat-panel";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getGoogleCalendarConnection, listUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";
import type { Project } from "@/types";

const TIME_ZONE = "America/Sao_Paulo";

export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });

  const activities: { label: string; time?: string }[] = [];
  let calendarConnected = false;

  if (user) {
    const connection = await getGoogleCalendarConnection(user.id);
    calendarConnected = Boolean(connection);

    if (connection) {
      try {
        const events = await listUpcomingGoogleCalendarEvents(connection.access_token, {
          days: 1,
        });
        for (const event of events.slice(0, 4)) {
          activities.push({
            label: event.summary || "(sem título)",
            time: event.start.dateTime
              ? new Date(event.start.dateTime).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Dia inteiro",
          });
        }
      } catch {
        // Token expirado ou agenda indisponível — apenas omite os eventos do dashboard.
      }
    }

    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3);

    for (const project of (projectsData ?? []) as Project[]) {
      activities.push({ label: `Projeto: ${project.name}` });
    }
  }

  const agents = [
    { label: "Google Agenda", connected: calendarConnected },
    { label: "Assistente (OpenAI)", connected: Boolean(process.env.OPENAI_API_KEY) },
    { label: "Conta (Supabase)", connected: Boolean(user) },
  ];

  return <ChatPanel dateLabel={dateLabel} activities={activities} agents={agents} />;
}
