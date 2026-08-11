"use client";

import { useMemo, useState } from "react";
import type { GoogleCalendarEvent } from "@/lib/google-calendar";

type View = "daily" | "weekly";

function eventDateKey(event: GoogleCalendarEvent) {
  const raw = event.start.date ?? event.start.dateTime;
  if (!raw) return "";
  return new Date(raw).toLocaleDateString("sv-SE");
}

function formatEventTime(event: GoogleCalendarEvent) {
  if (event.start.date) return "Dia inteiro";
  if (!event.start.dateTime) return "";
  return new Date(event.start.dateTime).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayHeading(dateKey: string) {
  const today = new Date();
  const todayKey = today.toLocaleDateString("sv-SE");
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = tomorrow.toLocaleDateString("sv-SE");

  if (dateKey === todayKey) return "Hoje";
  if (dateKey === tomorrowKey) return "Amanhã";

  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

export function GoogleCalendarPanel({
  connected,
  events,
  error,
}: {
  connected: boolean;
  events: GoogleCalendarEvent[];
  error: string | null;
}) {
  const [view, setView] = useState<View>("daily");
  const todayKey = new Date().toLocaleDateString("sv-SE");

  const dailyEvents = useMemo(
    () => events.filter((event) => eventDateKey(event) === todayKey),
    [events, todayKey]
  );

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, GoogleCalendarEvent[]>();
    for (const event of events) {
      const key = eventDateKey(event);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <div className="hud-panel flex flex-col gap-3 rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="hud-eyebrow">GOOGLE AGENDA</h2>
        {connected && !error && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setView("daily")}
              className={view === "daily" ? "text-[#00d4ff]" : "text-zinc-400 hover:text-zinc-50"}
            >
              Diário
            </button>
            <span className="text-zinc-600">/</span>
            <button
              type="button"
              onClick={() => setView("weekly")}
              className={view === "weekly" ? "text-[#00d4ff]" : "text-zinc-400 hover:text-zinc-50"}
            >
              Semanal
            </button>
          </div>
        )}
      </div>

      {!connected && (
        <p className="py-2 text-sm text-zinc-400">
          Agenda não conectada. Use o botão &quot;Conectar Google Agenda&quot; no topo da tela.
        </p>
      )}

      {connected && error && <p className="py-2 text-sm text-red-400">{error}</p>}

      {connected && !error && view === "daily" && (
        <>
          {dailyEvents.length === 0 ? (
            <p className="py-2 text-sm text-zinc-400">Nenhum evento hoje.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/10">
              {dailyEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </>
      )}

      {connected && !error && view === "weekly" && (
        <>
          {groupedByDay.length === 0 ? (
            <p className="py-2 text-sm text-zinc-400">Nenhum evento nos próximos 7 dias.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {groupedByDay.map(([dateKey, dayEvents]) => (
                <div key={dateKey}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {formatDayHeading(dateKey)}
                  </p>
                  <ul className="flex flex-col divide-y divide-white/10">
                    {dayEvents.map((event) => (
                      <EventRow key={event.id} event={event} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventRow({ event }: { event: GoogleCalendarEvent }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <a
        href={event.htmlLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-200 hover:text-[#00d4ff]"
      >
        {event.summary || "(sem título)"}
      </a>
      <span className="shrink-0 font-mono text-xs text-zinc-400">{formatEventTime(event)}</span>
    </li>
  );
}
