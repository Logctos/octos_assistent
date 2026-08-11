import { WeatherWidget } from "@/components/weather-widget";
import { HudClock } from "@/components/hud-clock";
import type { NewsItem } from "@/lib/tech-news";

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
      <h2 className="hud-eyebrow">DATA</h2>
      <div className="mt-2 text-2xl font-bold tracking-wide text-zinc-50">
        <HudClock />
      </div>
      <p className="mt-1 text-sm capitalize text-zinc-400">{dateLabel}</p>
    </div>
  );
}

export function WeatherTile() {
  return (
    <div className="hud-panel rounded-sm p-4">
      <h2 className="hud-eyebrow">CLIMA</h2>
      <div className="mt-2">
        <WeatherWidget />
      </div>
    </div>
  );
}

export function NewsTile({ news }: { news: NewsItem[] }) {
  return (
    <div className="hud-panel rounded-sm p-4">
      <h2 className="hud-eyebrow">Notícias de IA</h2>
      {news.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">Sem notícias no momento.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {news.map((item) => (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="line-clamp-2 text-sm leading-snug text-zinc-200 hover:text-[#00d4ff]"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ActivitiesTile({ activities }: { activities: Activity[] }) {
  return (
    <div className="hud-panel rounded-sm p-4">
      <h2 className="hud-eyebrow">PRINCIPAIS ATIVIDADES</h2>
      {activities.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">Nada por enquanto.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {activities.map((activity, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-2 text-sm text-zinc-200"
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
      <h2 className="hud-eyebrow">AGENTES CONECTADOS</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {agents.map((agent) => (
          <li key={agent.label} className="flex items-center gap-2 text-sm text-zinc-200">
            <span
              className={
                agent.connected
                  ? "h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]"
                  : "h-1.5 w-1.5 rounded-full bg-zinc-600"
              }
            />
            {agent.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
