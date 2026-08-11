import { supabase } from "@/lib/supabase";
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
