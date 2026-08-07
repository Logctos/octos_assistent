import { supabase } from "@/lib/supabase";

interface GoogleCalendarConnection {
  access_token: string;
  refresh_token: string | null;
}

export async function getGoogleCalendarConnection(
  userId: string
): Promise<GoogleCalendarConnection | null> {
  const { data } = await supabase
    .from("google_calendar_connections")
    .select("access_token, refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  htmlLink: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export async function listUpcomingGoogleCalendarEvents(
  accessToken: string,
  { maxResults = 50, days = 7 }: { maxResults?: number; days?: number } = {}
): Promise<GoogleCalendarEvent[]> {
  const timeMin = new Date();
  const timeMax = new Date(timeMin.getTime() + days * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error(
        "O acesso ao Google Agenda expirou. Reconecte pelo botão no topo da tela."
      );
    }
    throw new Error(`Google Calendar API respondeu ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.items ?? [];
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: { summary: string; start: string; end: string; description?: string }
): Promise<{ htmlLink: string }> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error(
        "O acesso ao Google Agenda expirou. Peça para reconectar pelo botão no topo da tela."
      );
    }
    throw new Error(`Google Calendar API respondeu ${response.status}: ${body}`);
  }

  return response.json();
}
