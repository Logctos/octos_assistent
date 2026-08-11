import { supabase } from "@/lib/supabase";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import type { HealthLog } from "@/types";

export async function listHealthLogsForMonth(month: string): Promise<HealthLog[]> {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));

  const { data } = await supabase
    .from("health_logs")
    .select("*")
    .gte("log_date", start.toISOString().slice(0, 10))
    .lt("log_date", end.toISOString().slice(0, 10))
    .order("log_date", { ascending: false });

  return (data ?? []) as HealthLog[];
}

export async function createHealthLog(input: {
  logDate: string;
  weightKg: number | null;
  activityMinutes: number | null;
  sleepHours: number | null;
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { logDate, weightKg, activityMinutes, sleepHours } = input;

  if (weightKg === null && activityMinutes === null && sleepHours === null) {
    return { error: "Informe ao menos uma medida" };
  }

  const { error } = await supabase.from("health_logs").insert({
    user_id: user.id,
    log_date: logDate,
    weight_kg: weightKg,
    activity_minutes: activityMinutes,
    sleep_hours: sleepHours,
  });

  return { error: error?.message ?? null };
}

export async function deleteHealthLog(id: string): Promise<void> {
  const { error } = await supabase.from("health_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

const WEEKLY_REMINDER_KEY = "octos:weeklyWeightReminder";

export interface WeeklyReminderStatus {
  active: boolean;
  eventLink: string | null;
}

/** Reads the locally-remembered "already created" flag — avoids re-creating the recurring event on every visit. */
export function readWeeklyReminderStatus(): WeeklyReminderStatus {
  const raw = localStorage.getItem(WEEKLY_REMINDER_KEY);
  if (!raw) return { active: false, eventLink: null };

  try {
    const parsed = JSON.parse(raw) as { eventLink: string };
    return { active: true, eventLink: parsed.eventLink };
  } catch {
    return { active: false, eventLink: null };
  }
}

function nextWeekdayAt(targetDay: number, hour: number, minute = 0) {
  const now = new Date();
  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);

  let diff = (targetDay - now.getDay() + 7) % 7;
  if (diff === 0 && date <= now) diff = 7;
  date.setDate(now.getDate() + diff);

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

/** Creates a recurring weekly Google Calendar event (Sundays, 9am) reminding the user to log their weight. */
export async function createWeeklyWeightReminder(
  accessToken: string
): Promise<{ error: string | null; eventLink: string | null }> {
  const start = nextWeekdayAt(0, 9);
  const end = new Date(start.getTime() + 15 * 60_000);

  try {
    const event = await createGoogleCalendarEvent(accessToken, {
      summary: "Lançar peso no Octos",
      description: "Lembrete semanal para registrar seu peso na aba Saúde do Octos.",
      start: toLocalIso(start),
      end: toLocalIso(end),
      recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=SU"],
    });

    localStorage.setItem(WEEKLY_REMINDER_KEY, JSON.stringify({ eventLink: event.htmlLink }));
    return { error: null, eventLink: event.htmlLink };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao criar lembrete",
      eventLink: null,
    };
  }
}
