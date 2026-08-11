import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { HealthLog } from "@/types";
import {
  listHealthLogsForMonth,
  deleteHealthLog,
  createWeeklyWeightReminder,
  readWeeklyReminderStatus,
  type WeeklyReminderStatus,
} from "@/features/saude/api";
import { HealthForm } from "@/features/saude/health-form";
import { readSleepSuggestion } from "@/lib/activity-tracker";
import { useAuth } from "@/lib/auth-context";
import { getGoogleCalendarConnection } from "@/lib/google-calendar";

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const label = new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

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

export function SaudePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthParam = searchParams.get("month");
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth;

  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [suggestedSleep] = useState(() => readSleepSuggestion());

  const [calendarAccessToken, setCalendarAccessToken] = useState<string | null>(null);
  const [reminder, setReminder] = useState<WeeklyReminderStatus>(() => readWeeklyReminderStatus());
  const [reminderPending, setReminderPending] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    listHealthLogsForMonth(month).then(setLogs);
  }, [month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!user) return;
    getGoogleCalendarConnection(user.id).then((connection) => {
      setCalendarAccessToken(connection?.access_token ?? null);
    });
  }, [user]);

  async function handleDelete(id: string) {
    await deleteHealthLog(id);
    refetch();
  }

  async function handleActivateReminder() {
    if (!calendarAccessToken) return;
    setReminderPending(true);
    setReminderError(null);

    const { error, eventLink } = await createWeeklyWeightReminder(calendarAccessToken);

    setReminderPending(false);
    if (error) {
      setReminderError(error);
      return;
    }
    setReminder({ active: true, eventLink });
  }

  const weights = logs.map((l) => l.weight_kg).filter((v): v is number => v !== null);
  const activityMinutes = logs
    .map((l) => l.activity_minutes)
    .filter((v): v is number => v !== null);
  const sleepHours = logs.map((l) => l.sleep_hours).filter((v): v is number => v !== null);

  const avgWeight = average(weights);
  const totalActivity = activityMinutes.reduce((sum, v) => sum + v, 0);
  const avgSleep = average(sleepHours);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="hud-eyebrow">Módulo de saúde</span>
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-zinc-50">Saúde</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            to={`/saude?month=${shiftMonth(month, -1)}`}
            className="hud-button rounded-sm px-2 py-1 text-xs"
          >
            ←
          </Link>
          <span className="text-zinc-200">{formatMonthLabel(month)}</span>
          <Link
            to={`/saude?month=${shiftMonth(month, 1)}`}
            className="hud-button rounded-sm px-2 py-1 text-xs"
          >
            →
          </Link>
        </div>
      </div>

      <div className="hud-panel flex flex-wrap items-center justify-between gap-3 rounded-sm p-4">
        <div className="flex flex-col gap-1">
          <span className="hud-eyebrow">Lembrete semanal</span>
          {reminder.active ? (
            <p className="text-sm text-zinc-300">
              Ativo — todo domingo às 9h no Google Agenda.{" "}
              {reminder.eventLink && (
                <a
                  href={reminder.eventLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00d4ff] hover:underline"
                >
                  Ver evento
                </a>
              )}
            </p>
          ) : (
            <p className="text-sm text-zinc-400">
              {calendarAccessToken
                ? "Crie um evento recorrente para lembrar de lançar seu peso."
                : "Conecte o Google Agenda (botão no menu) para ativar o lembrete."}
            </p>
          )}
          {reminderError && <p className="text-xs text-red-400">{reminderError}</p>}
        </div>
        {!reminder.active && calendarAccessToken && (
          <button
            type="button"
            onClick={handleActivateReminder}
            disabled={reminderPending}
            className="hud-button rounded-sm px-4 py-2 text-sm"
          >
            {reminderPending ? "Ativando…" : "Ativar lembrete"}
          </button>
        )}
      </div>

      <HealthForm onCreated={refetch} suggestedSleepHours={suggestedSleep} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="hud-panel flex flex-col gap-1 rounded-sm p-4">
          <span className="hud-eyebrow">Peso médio</span>
          <span className="font-outfit text-xl font-semibold text-zinc-50">
            {avgWeight !== null ? `${avgWeight.toFixed(1)} kg` : "—"}
          </span>
        </div>
        <div className="hud-panel flex flex-col gap-1 rounded-sm p-4">
          <span className="hud-eyebrow">Atividade física</span>
          <span className="font-outfit text-xl font-semibold text-zinc-50">
            {totalActivity > 0 ? formatHours(totalActivity) : "—"}
          </span>
        </div>
        <div className="hud-panel flex flex-col gap-1 rounded-sm p-4">
          <span className="hud-eyebrow">Sono médio</span>
          <span className="font-outfit text-xl font-semibold text-zinc-50">
            {avgSleep !== null ? `${avgSleep.toFixed(1)} h` : "—"}
          </span>
        </div>
      </div>

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        <p className="border-b border-white/10 pb-2 text-sm text-zinc-400">Registros do período</p>

        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">Nenhum registro neste mês.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="text-zinc-200">
                    {new Date(`${log.log_date}T00:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {log.weight_kg !== null && `${log.weight_kg} kg`}
                    {log.weight_kg !== null && (log.activity_minutes !== null || log.sleep_hours !== null)
                      ? " · "
                      : ""}
                    {log.activity_minutes !== null && `${log.activity_minutes} min de atividade`}
                    {log.activity_minutes !== null && log.sleep_hours !== null ? " · " : ""}
                    {log.sleep_hours !== null && `${log.sleep_hours} h de sono`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(log.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
