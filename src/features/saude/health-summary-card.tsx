import { useEffect, useState } from "react";
import type { HealthLog } from "@/types";
import { listRecentHealthLogs } from "@/features/saude/api";
import { computeHealthScore, estimateTrainingCalories, RECOMMENDED_SLEEP_HOURS } from "@/lib/health-metrics";

const SCORE_COLOR: Record<string, string> = {
  Excelente: "text-emerald-400",
  Bom: "text-[#7fe9ff]",
  "Atenção": "text-amber-400",
  Preocupante: "text-red-400",
};

const SUMMARY_WINDOW_DAYS = 7;

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  return `${hours}h${mins.toString().padStart(2, "0")}`;
}

export function HealthSummaryCard() {
  const [logs, setLogs] = useState<HealthLog[] | null>(null);

  useEffect(() => {
    listRecentHealthLogs(SUMMARY_WINDOW_DAYS).then(setLogs);
  }, []);

  if (logs === null) return null;
  if (logs.length === 0) return null;

  // logs come newest-first; the most recent weigh-in stands in for "current weight" when a
  // session wasn't logged alongside a weight on the same day.
  const latestWeight = logs.find((l) => l.weight_kg !== null)?.weight_kg ?? null;

  const trainingMinutes = logs
    .map((l) => l.activity_minutes)
    .filter((v): v is number => v !== null && v > 0);
  const sessionCount = trainingMinutes.length;
  const totalMinutes = trainingMinutes.reduce((sum, v) => sum + v, 0);
  const calories = latestWeight !== null && totalMinutes > 0
    ? estimateTrainingCalories(totalMinutes, latestWeight)
    : null;

  const sleepValues = logs.map((l) => l.sleep_hours).filter((v): v is number => v !== null);
  const avgSleep = average(sleepValues);
  const sleepLow = avgSleep !== null && avgSleep < RECOMMENDED_SLEEP_HOURS;

  const weightEntries = [...logs].reverse().filter((l) => l.weight_kg !== null);
  const weightDelta =
    weightEntries.length >= 2
      ? (weightEntries[weightEntries.length - 1].weight_kg as number) -
        (weightEntries[0].weight_kg as number)
      : null;

  const score = computeHealthScore({ sessionsPerWeek: sessionCount, avgSleepHours: avgSleep });

  return (
    <div className="hud-panel rounded-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="hud-eyebrow">Estado de saúde (7 dias)</h2>
        {score && (
          <span className={`font-outfit text-lg font-bold leading-none ${SCORE_COLOR[score.label]}`}>
            {score.score}
            <span className="ml-1 text-xs font-normal text-zinc-500">{score.label}</span>
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-300">
        <p>
          🥋 {sessionCount > 0 ? (
            <>
              {sessionCount} treino{sessionCount > 1 ? "s" : ""} de jiu-jitsu ·{" "}
              {formatHours(totalMinutes)} de tatame
            </>
          ) : (
            "Nenhum treino registrado"
          )}
        </p>
        <p className="text-xs text-zinc-400">
          {calories !== null
            ? `🔥 ~${calories} kcal estimadas`
            : sessionCount > 0
              ? "🔥 Registre seu peso na aba Saúde pra estimar as calorias"
              : null}
        </p>
        {avgSleep !== null && (
          <p className={sleepLow ? "text-amber-400" : "text-zinc-400"}>
            😴 Sono médio: {avgSleep.toFixed(1)}h
            {sleepLow ? ` — abaixo do recomendado (${RECOMMENDED_SLEEP_HOURS}h)` : ""}
          </p>
        )}
        {weightDelta !== null && Math.abs(weightDelta) >= 0.1 && (
          <p className="text-zinc-400">
            ⚖️ Peso {weightDelta > 0 ? "subiu" : "caiu"} {Math.abs(weightDelta).toFixed(1)}kg
            na semana
          </p>
        )}
      </div>
    </div>
  );
}
