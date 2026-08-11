import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { YesterdaySummaryCard } from "@/features/diario/yesterday-summary-card";
import { NextStudyCard } from "@/features/estudos/next-study-card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getGoogleCalendarConnection, listUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";
import { getTechNews } from "@/lib/tech-news";
import type { NewsItem } from "@/lib/tech-news";
import type { Project } from "@/types";

const TIME_ZONE = "America/Sao_Paulo";
const API_KEY_STORAGE_KEY = "octos:openai-api-key";

interface Activity {
  label: string;
  time?: string;
}

export function ChatRoute() {
  const { user } = useAuth();
  const [dateLabel] = useState(() =>
    new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: TIME_ZONE,
    })
  );
  const [activities, setActivities] = useState<Activity[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    getTechNews().then(setNews);
  }, []);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const nextActivities: Activity[] = [];

      const connection = await getGoogleCalendarConnection(user.id);
      setCalendarConnected(Boolean(connection));

      if (connection) {
        try {
          const events = await listUpcomingGoogleCalendarEvents(connection.access_token, { days: 1 });
          for (const event of events.slice(0, 4)) {
            nextActivities.push({
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
        nextActivities.push({ label: `Projeto: ${project.name}` });
      }

      setActivities(nextActivities);
    })();
  }, [user]);

  const agents = [
    { label: "Google Agenda", connected: calendarConnected },
    { label: "Assistente (OpenAI)", connected: Boolean(localStorage.getItem(API_KEY_STORAGE_KEY)) },
    { label: "Conta (Supabase)", connected: Boolean(user) },
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <NextStudyCard />
      <YesterdaySummaryCard />
      <ChatPanel dateLabel={dateLabel} activities={activities} agents={agents} news={news} />
    </div>
  );
}
