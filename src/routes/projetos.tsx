import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { listProjects, deleteProject } from "@/features/projetos/api";
import { ProjectForm } from "@/features/projetos/project-form";
import { ProjectStatusSelect } from "@/components/project-status-select";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";
import { getGoogleCalendarConnection, listUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";
import type { GoogleCalendarEvent } from "@/lib/google-calendar";

export function ProjetosPage() {
  const { user } = useAuth();
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
      <div className="flex flex-col gap-1.5">
        <span className="hud-eyebrow">Gestão de projetos</span>
        <h1 className="font-outfit text-2xl font-bold tracking-tight text-black">Projetos</h1>
      </div>

      <GoogleCalendarPanel connected={calendarConnected} events={calendarEvents} error={calendarError} />

      <ProjectForm onCreated={refetchProjects} />

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Nenhum projeto cadastrado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="text-zinc-800">{project.name}</p>
                  {project.description && (
                    <p className="text-xs text-zinc-500">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ProjectStatusSelect
                    id={project.id}
                    status={project.status}
                    onChanged={refetchProjects}
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(project.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
