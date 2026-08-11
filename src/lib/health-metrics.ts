/** MET (metabolic equivalent) for Brazilian Jiu-Jitsu / grappling training, per the Compendium of Physical Activities. */
const JIU_JITSU_MET = 10.3;

export const RECOMMENDED_SLEEP_HOURS = 7;
const TARGET_SESSIONS_PER_WEEK = 3;

/** Rough calorie estimate for a training session: MET × body weight (kg) × duration (hours). */
export function estimateTrainingCalories(minutes: number, weightKg: number): number {
  return Math.round(JIU_JITSU_MET * weightKg * (minutes / 60));
}

export interface HealthScore {
  score: number;
  label: "Excelente" | "Bom" | "Atenção" | "Preocupante";
}

/**
 * 0-100 score blending training frequency (vs. a 3x/week target) and sleep (vs. the
 * recommended hours). Averages whichever signals are actually available — returns null
 * when there's nothing to score yet.
 */
export function computeHealthScore(input: {
  sessionsPerWeek: number | null;
  avgSleepHours: number | null;
}): HealthScore | null {
  const components: number[] = [];

  if (input.sessionsPerWeek !== null) {
    components.push(Math.min(100, (input.sessionsPerWeek / TARGET_SESSIONS_PER_WEEK) * 100));
  }
  if (input.avgSleepHours !== null) {
    components.push(Math.max(0, 100 - Math.abs(input.avgSleepHours - RECOMMENDED_SLEEP_HOURS) * 20));
  }

  if (components.length === 0) return null;

  const score = Math.round(components.reduce((sum, v) => sum + v, 0) / components.length);
  const label =
    score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Atenção" : "Preocupante";

  return { score, label };
}
