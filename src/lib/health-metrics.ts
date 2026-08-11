/** MET (metabolic equivalent) for Brazilian Jiu-Jitsu / grappling training, per the Compendium of Physical Activities. */
const JIU_JITSU_MET = 10.3;

export const RECOMMENDED_SLEEP_HOURS = 7;

/** Rough calorie estimate for a training session: MET × body weight (kg) × duration (hours). */
export function estimateTrainingCalories(minutes: number, weightKg: number): number {
  return Math.round(JIU_JITSU_MET * weightKg * (minutes / 60));
}
