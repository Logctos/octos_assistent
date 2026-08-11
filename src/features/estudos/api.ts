import { supabase } from "@/lib/supabase";
import type { StudyMaterial, StudySession, StudySource } from "@/types";

const XP_PER_LEVEL = 100;

export async function listStudySessions(): Promise<StudySession[]> {
  const { data } = await supabase
    .from("study_sessions")
    .select("*")
    .order("session_date", { ascending: true });

  return (data ?? []) as StudySession[];
}

export interface NewStudySession {
  planLabel: string;
  topic: string;
  sessionDate: string;
  durationMinutes: number;
  xpValue: number;
  calendarEventLink?: string | null;
}

export async function createStudySessions(
  sessions: NewStudySession[]
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  if (sessions.length === 0) return { error: "Nenhuma sessão para criar" };

  const { error } = await supabase.from("study_sessions").insert(
    sessions.map((s) => ({
      user_id: user.id,
      plan_label: s.planLabel,
      topic: s.topic,
      session_date: s.sessionDate,
      duration_minutes: s.durationMinutes,
      xp_value: s.xpValue,
      calendar_event_link: s.calendarEventLink ?? null,
    }))
  );

  return { error: error?.message ?? null };
}

/** Best-effort match for the chat tool: pending session whose topic contains the query, closest date first. */
export async function findPendingSessionByTopic(topic: string): Promise<StudySession | null> {
  const sessions = await listStudySessions();
  const pending = sessions.filter((s) => !s.completed);
  if (pending.length === 0) return null;

  const needle = topic.trim().toLowerCase();
  const matches = needle ? pending.filter((s) => s.topic.toLowerCase().includes(needle)) : pending;
  if (matches.length === 0) return null;

  return matches.reduce((closest, s) => (s.session_date < closest.session_date ? s : closest));
}

export async function completeStudySession(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("study_sessions")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function deleteStudySession(id: string): Promise<void> {
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listStudyMaterials(): Promise<StudyMaterial[]> {
  const { data } = await supabase
    .from("study_materials")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as StudyMaterial[];
}

/** Most recent material whose topic contains the query (case-insensitive), or null if none. */
export async function findStudyMaterialByTopic(topic: string): Promise<StudyMaterial | null> {
  const materials = await listStudyMaterials();
  const needle = topic.trim().toLowerCase();
  if (!needle) return materials[0] ?? null;

  return materials.find((m) => m.topic.toLowerCase().includes(needle)) ?? null;
}

export async function saveStudyMaterial(input: {
  planLabel?: string | null;
  topic: string;
  content: string;
  sources: StudySource[];
  baseMaterial?: string | null;
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("study_materials").insert({
    user_id: user.id,
    plan_label: input.planLabel ?? null,
    topic: input.topic,
    content: input.content,
    sources: input.sources,
    base_material: input.baseMaterial ?? null,
  });

  return { error: error?.message ?? null };
}

export interface StudyStats {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streak: number;
  completedCount: number;
  pendingCount: number;
  /** % of all scheduled sessions (across the whole history, not just this week) marked completed. */
  efficiencyPct: number;
}

export function computeStudyStats(sessions: StudySession[]): StudyStats {
  const completed = sessions.filter((s) => s.completed);
  const totalXp = completed.reduce((sum, s) => sum + s.xp_value, 0);
  const pendingCount = sessions.length - completed.length;

  return {
    totalXp,
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    xpIntoLevel: totalXp % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
    streak: computeStreak(completed),
    completedCount: completed.length,
    pendingCount,
    efficiencyPct:
      sessions.length === 0 ? 0 : Math.round((completed.length / sessions.length) * 100),
  };
}

function computeStreak(completed: StudySession[]): number {
  const days = new Set(
    completed.filter((s) => s.completed_at).map((s) => s.completed_at!.slice(0, 10))
  );
  if (days.size === 0) return 0;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const todayKey = new Date().toLocaleDateString("sv-SE");
  let cursor = days.has(todayKey) ? new Date() : new Date(Date.now() - oneDayMs);

  let streak = 0;
  while (days.has(cursor.toLocaleDateString("sv-SE"))) {
    streak++;
    cursor = new Date(cursor.getTime() - oneDayMs);
  }
  return streak;
}
