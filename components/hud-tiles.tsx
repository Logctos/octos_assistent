import { WeatherWidget } from "@/components/weather-widget";
import { HudClock } from "@/components/hud-clock";

interface Activity {
  label: string;
  time?: string;
}

interface AgentStatus {
  label: string;
  connected: boolean;
}

export function DateTile({ dateLabel }: { dateLabel: string }) {
  return (
    <div className="hud-panel rounded-sm p-4">
      <h2 className="text-xs font-bold tracking-widest text-[#0084FF]/70">DATA</h2>
      <div className="mt-2 text-2xl font-bold tracking-wide text-zinc-900">
        <HudClock />
      </div>
      <p className="mt-1 text-sm capitalize text-zinc-500">{dateLabel}</p>
    </div>
  );
}

export function WeatherTile() {
  return (
    <div className="hud-panel rounded-sm p-4">
      <h2 className="text-xs font-bold tracking-widest text-[#0084FF]/70">CLIMA</h2>
      <div className="mt-2">
        <WeatherWidget />
      </div>
    </div>
  );
}

export function ActivitiesTile({ activities }: { activities: Activity[] }) {
  return (
    <div className="hud-panel rounded-sm p-4">
      <h2 className="text-xs font-bold tracking-widest text-[#0084FF]/70">
        PRINCIPAIS ATIVIDADES
      </h2>
      {activities.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">Nada por enquanto.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {activities.map((activity, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-2 text-sm text-zinc-800"
            >
              <span className="truncate">{activity.label}</span>
              {activity.time && (
                <span className="shrink-0 font-mono text-xs text-zinc-500">{activity.time}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AgentsTile({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="hud-panel rounded-sm p-4">
      <h2 className="text-xs font-bold tracking-widest text-[#0084FF]/70">AGENTES CONECTADOS</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {agents.map((agent) => (
          <li key={agent.label} className="flex items-center gap-2 text-sm text-zinc-800">
            <span
              className={
                agent.connected
                  ? "h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]"
                  : "h-1.5 w-1.5 rounded-full bg-zinc-300"
              }
            />
            {agent.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
