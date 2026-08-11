import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { listProjects, deleteProject } from "@/features/projetos/api";
import { ProjectForm } from "@/features/projetos/project-form";
import { ProjectStatusSelect } from "@/components/project-status-select";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";
import { getGoogleCalendarConnection, listUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";
import type { GoogleCalendarEvent } from "@/lib/google-calendar";
import { StudyPlanPanel } from "@/features/estudos/study-plan-panel";

type ProjetosTab = "projetos" | "estudos";

export function ProjetosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ProjetosTab>("projetos");
  const [projects, setProjects] = useState<Project[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const refetchProjects = useCallback(() => {
    listProjects().then(setProjects);
  }, []);

  useEffect(() => {
    refetchProjects();
  }, [refetchProjects]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const connection = await getGoogleCalendarConnection(user.id);
      setCalendarConnected(Boolean(connection));
      if (!connection) return;

      try {
        const events = await listUpcomingGoogleCalendarEvents(connection.access_token, { days: 7 });
        setCalendarEvents(events);
      } catch (error) {
        setCalendarError(error instanceof Error ? error.message : "Falha ao carregar a agenda");
      }
    })();
  }, [user]);

  async function handleDelete(id: string) {
    await deleteProject(id);
    refetchProjects();
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="hud-eyebrow">Gestão de projetos</span>
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-zinc-50">
            {tab === "projetos" ? "Projetos" : "Plano de estudos"}
          </h1>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("projetos")}
            className={
              tab === "projetos" ? "hud-button rounded-sm px-3 py-1.5" : "rounded-sm px-3 py-1.5 text-zinc-400"
            }
          >
            Projetos
          </button>
          <button
            type="button"
            onClick={() => setTab("estudos")}
            className={
              tab === "estudos" ? "hud-button rounded-sm px-3 py-1.5" : "rounded-sm px-3 py-1.5 text-zinc-400"
            }
          >
            🎮 Plano de estudos
          </button>
        </div>
      </div>

      {tab === "projetos" ? (
        <>
          <GoogleCalendarPanel
            connected={calendarConnected}
            events={calendarEvents}
            error={calendarError}
          />

          <ProjectForm onCreated={refetchProjects} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ProjectCategorySection
              title="Estudos"
              projects={projects.filter((p) => p.category === "estudos")}
              onDelete={handleDelete}
              onChanged={refetchProjects}
            />
            <ProjectCategorySection
              title="Trabalho"
              projects={projects.filter((p) => p.category === "trabalho")}
              onDelete={handleDelete}
              onChanged={refetchProjects}
            />
            <ProjectCategorySection
              title="Ambas"
              projects={projects.filter((p) => p.category === "ambas")}
              onDelete={handleDelete}
              onChanged={refetchProjects}
            />
          </div>
        </>
      ) : (
        <StudyPlanPanel />
      )}
    </div>
  );
}

function ProjectCategorySection({
  title,
  projects,
  onDelete,
  onChanged,
}: {
  title: string;
  projects: Project[];
  onDelete: (id: string) => void;
  onChanged: () => void;
}) {
  return (
    <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
      <span className="hud-eyebrow">{title}</span>
      {projects.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-400">Nenhum projeto aqui.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10">
          {projects.map((project) => (
            <li key={project.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="text-zinc-200">{project.name}</p>
                {project.description && (
                  <p className="text-xs text-zinc-400">{project.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <ProjectStatusSelect id={project.id} status={project.status} onChanged={onChanged} />
                <button
                  type="button"
                  onClick={() => onDelete(project.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
