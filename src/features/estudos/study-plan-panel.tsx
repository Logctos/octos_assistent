import { useCallback, useEffect, useState } from "react";
import type { StudyMaterial, StudySession } from "@/types";
import {
  computeStudyStats,
  deleteStudySession,
  listStudyMaterials,
  listStudySessions,
} from "@/features/estudos/api";

function formatSessionDate(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/** One card per topic, keeping only the most recent material (listStudyMaterials is already newest-first). */
function dedupeByTopic(materials: StudyMaterial[]): StudyMaterial[] {
  const seen = new Set<string>();
  const result: StudyMaterial[] = [];
  for (const m of materials) {
    const key = m.topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(m);
  }
  return result;
}

export function StudyPlanPanel() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(() => {
    Promise.all([listStudySessions(), listStudyMaterials()]).then(([sessionData, materialData]) => {
      setSessions(sessionData);
      setMaterials(materialData);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleCancel(id: string) {
    await deleteStudySession(id);
    refetch();
  }

  if (isLoading) {
    return <div className="hud-panel rounded-sm p-4 text-sm text-zinc-400">Carregando…</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="hud-panel flex flex-col items-center gap-2 rounded-sm p-8 text-center">
        <span className="hud-eyebrow">Plano de estudos</span>
        <p className="max-w-sm text-sm text-zinc-400">
          Nenhum plano ainda. Peça no chat, ex: &quot;monta um plano de estudos de React e
          Inglês&quot; — o Octos cria as sessões já com XP e agenda no Google Agenda.
        </p>
      </div>
    );
  }

  const stats = computeStudyStats(sessions);
  const pending = [...sessions]
    .filter((s) => !s.completed)
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  const completed = [...sessions]
    .filter((s) => s.completed)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  const xpPct = Math.round((stats.xpIntoLevel / stats.xpForNextLevel) * 100);
  const topicMaterials = dedupeByTopic(materials);

  return (
    <div className="flex flex-col gap-4">
      <div className="hud-panel flex flex-col gap-3 rounded-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#00d4ff]/40 bg-[#00d4ff]/10 font-outfit text-lg font-bold text-[#00d4ff]">
              {stats.level}
            </span>
            <div>
              <p className="hud-eyebrow">Nível {stats.level}</p>
              <p className="text-xs text-zinc-400">{stats.totalXp} XP total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-200">
            <span aria-hidden>🔥</span>
            <span>{stats.streak} dia(s) seguidos</span>
          </div>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] to-[#7fe9ff] transition-[width] duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-zinc-500">
            {stats.xpIntoLevel}/{stats.xpForNextLevel} XP para o nível {stats.level + 1}
          </p>
        </div>
      </div>

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        <span className="hud-eyebrow">Eficiência atingida</span>
        <div className="flex items-center gap-4">
          <span className="font-outfit text-3xl font-bold text-[#00d4ff]">{stats.efficiencyPct}%</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#00d4ff] transition-[width] duration-500"
              style={{ width: `${stats.efficiencyPct}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          {stats.completedCount} de {stats.completedCount + stats.pendingCount} sessões concluídas
        </p>
      </div>

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        <span className="hud-eyebrow">Sessões pendentes ({pending.length})</span>
        {pending.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            Nenhuma sessão pendente — bom trabalho!
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {pending.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="text-zinc-200">{s.topic}</p>
                  <p className="text-xs text-zinc-400">
                    {formatSessionDate(s.session_date)} · {s.duration_minutes} min · +{s.xp_value} XP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancel(s.id)}
                  className="shrink-0 text-xs text-red-400 hover:text-red-300"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {topicMaterials.length > 0 && (
        <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
          <span className="hud-eyebrow">Material de estudo ({topicMaterials.length})</span>
          <div className="flex flex-col divide-y divide-white/10">
            {topicMaterials.map((m) => (
              <details key={m.id} className="group py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm text-zinc-200 marker:content-none">
                  <span className="flex items-center gap-2">
                    <span aria-hidden>📚</span>
                    {m.topic}
                  </span>
                  <span className="text-xs text-zinc-500 transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">{m.content}</p>
                {m.sources.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {m.sources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#00d4ff] hover:underline"
                        >
                          {s.title || s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
          <span className="hud-eyebrow">Concluídas ({completed.length})</span>
          <ul className="flex flex-col divide-y divide-white/10">
            {completed.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <p className="text-zinc-500 line-through decoration-zinc-600">{s.topic}</p>
                <span className="shrink-0 text-xs text-emerald-400">+{s.xp_value} XP</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
