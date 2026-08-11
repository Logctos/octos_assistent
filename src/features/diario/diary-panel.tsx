import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getGoogleCalendarConnection } from "@/lib/google-calendar";
import type { DailySummary } from "@/types";
import {
  createDailyReminder,
  deleteDailySummary,
  listDailySummaries,
  readDailyReminderStatus,
  type DailyReminderStatus,
} from "@/features/diario/api";

function formatLogDate(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function DiaryPanel() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [calendarAccessToken, setCalendarAccessToken] = useState<string | null>(null);
  const [reminder, setReminder] = useState<DailyReminderStatus>(() => readDailyReminderStatus());
  const [reminderPending, setReminderPending] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    listDailySummaries().then((data) => {
      setSummaries(data);
      setIsLoading(false);
    });
  }, []);

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
    await deleteDailySummary(id);
    refetch();
  }

  async function handleActivateReminder() {
    if (!calendarAccessToken) return;
    setReminderPending(true);
    setReminderError(null);

    const { error, eventLink } = await createDailyReminder(calendarAccessToken);

    setReminderPending(false);
    if (error) {
      setReminderError(error);
      return;
    }
    setReminder({ active: true, eventLink });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hud-panel flex flex-wrap items-center justify-between gap-3 rounded-sm p-4">
        <div className="flex flex-col gap-1">
          <span className="hud-eyebrow">Lembrete diário</span>
          {reminder.active ? (
            <p className="text-sm text-zinc-300">
              Ativo — todo dia às 21h no Google Agenda.{" "}
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
                ? "Crie um lembrete diário pra mandar seu resumo de estudos/trabalho."
                : "Conecte o Google Agenda (menu lateral) pra ativar o lembrete."}
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

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        <span className="hud-eyebrow">Diário (estudos e trabalho)</span>
        <p className="text-xs text-zinc-500">
          Fale ou escreva no chat o que você estudou ou trabalhou — o Octos guarda aqui.
        </p>
        {isLoading ? (
          <p className="py-4 text-center text-sm text-zinc-400">Carregando…</p>
        ) : summaries.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            Nenhum resumo ainda. Diga no chat o que estudou ou trabalhou hoje.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {summaries.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">{formatLogDate(s.log_date)}</p>
                  <p className="text-zinc-200">{s.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="shrink-0 text-xs text-red-400 hover:text-red-300"
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
