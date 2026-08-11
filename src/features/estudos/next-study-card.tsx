import { useEffect, useState } from "react";
import type { StudyMaterial, StudySession } from "@/types";
import { findStudyMaterialByTopic, listStudySessions } from "@/features/estudos/api";

function formatSessionDate(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function NextStudyCard() {
  const [nextSession, setNextSession] = useState<StudySession | null | undefined>(undefined);
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);

  useEffect(() => {
    listStudySessions().then((sessions) => {
      const pending = sessions
        .filter((s) => !s.completed)
        .sort((a, b) => a.session_date.localeCompare(b.session_date));
      setNextSession(pending[0] ?? null);
    });
  }, []);

  async function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !material && nextSession) {
      setIsLoadingMaterial(true);
      const found = await findStudyMaterialByTopic(nextSession.topic);
      setMaterial(found);
      setIsLoadingMaterial(false);
    }
  }

  if (nextSession === undefined || nextSession === null) return null;

  return (
    <div className="hud-panel flex w-full flex-col gap-2 rounded-sm p-4">
      <span className="hud-eyebrow">O que estudar agora</span>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="font-outfit text-lg font-semibold text-zinc-50">{nextSession.topic}</p>
          <p className="text-xs text-zinc-400">
            {formatSessionDate(nextSession.session_date)} · {nextSession.duration_minutes} min · +
            {nextSession.xp_value} XP
          </p>
        </div>
        <span className="shrink-0 text-xs text-[#00d4ff]">
          {isOpen ? "Fechar ▴" : "Ver resumo ▾"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-1 border-t border-white/10 pt-2">
          {isLoadingMaterial ? (
            <p className="text-sm text-zinc-400">Carregando…</p>
          ) : material ? (
            <>
              <p className="whitespace-pre-line text-sm text-zinc-300">{material.content}</p>
              {material.sources.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {material.sources.map((s) => (
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
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              Ainda não há material pesquisado pra esse tema.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
