import { supabase } from "@/lib/supabase";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import type { DailySummary } from "@/types";

export async function listDailySummaries(): Promise<DailySummary[]> {
  const { data } = await supabase
    .from("daily_summaries")
    .select("*")
    .order("log_date", { ascending: false });

  return (data ?? []) as DailySummary[];
}

function todayDateOnly(): string {
  return new Date().toLocaleDateString("sv-SE");
}

function yesterdayDateOnly(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE");
}

/** Yesterday's entries, for the "resumo de ontem" recap on the chat home page. */
export async function listYesterdaySummaries(): Promise<DailySummary[]> {
  const { data } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("log_date", yesterdayDateOnly())
    .order("created_at", { ascending: true });

  return (data ?? []) as DailySummary[];
}

/** Appends one entry to the user's daily journal ("documento de armazenagem" the chat tool writes into). */
export async function saveDailySummary(input: {
  content: string;
  logDate?: string;
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const content = input.content.trim();
  if (!content) return { error: "Resumo vazio" };

  const { error } = await supabase.from("daily_summaries").insert({
    user_id: user.id,
    content,
    log_date: input.logDate ?? todayDateOnly(),
  });

  return { error: error?.message ?? null };
}

export async function deleteDailySummary(id: string): Promise<void> {
  const { error } = await supabase.from("daily_summaries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

const DAILY_REMINDER_KEY = "octos:dailySummaryReminder";

export interface DailyReminderStatus {
  active: boolean;
  eventLink: string | null;
}

/** Reads the locally-remembered "already created" flag — avoids re-creating the recurring event on every visit. */
export function readDailyReminderStatus(): DailyReminderStatus {
  const raw = localStorage.getItem(DAILY_REMINDER_KEY);
  if (!raw) return { active: false, eventLink: null };

  try {
    const parsed = JSON.parse(raw) as { eventLink: string };
    return { active: true, eventLink: parsed.eventLink };
  } catch {
    return { active: false, eventLink: null };
  }
}

function nextTimeToday(hour: number, minute = 0) {
  const now = new Date();
  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  if (date <= now) date.setDate(date.getDate() + 1);
  return date;
}

/** ISO 8601 with the browser's local UTC offset — Google Calendar needs an explicit offset (or timeZone) per event. */
function toLocalIso(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Creates a recurring daily Google Calendar event (21h) reminding the user to send their day's summary. */
export async function createDailyReminder(
  accessToken: string
): Promise<{ error: string | null; eventLink: string | null }> {
  const start = nextTimeToday(21, 0);
  const end = new Date(start.getTime() + 15 * 60_000);

  try {
    const event = await createGoogleCalendarEvent(accessToken, {
      summary: "📓 Mandar resumo do dia pro Octos",
      description:
        "Lembrete diário — fale ou escreva no chat do Octos o que você estudou ou trabalhou " +
        "hoje, e ele guarda no seu diário.",
      start: toLocalIso(start),
      end: toLocalIso(end),
      recurrence: ["RRULE:FREQ=DAILY"],
    });

    localStorage.setItem(DAILY_REMINDER_KEY, JSON.stringify({ eventLink: event.htmlLink }));
    return { error: null, eventLink: event.htmlLink };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao criar lembrete",
      eventLink: null,
    };
  }
}
