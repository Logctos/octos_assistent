import type { Project } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deleteProject } from "./actions";
import { ProjectForm } from "./project-form";
import { ProjectStatusSelect } from "@/components/project-status-select";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";
import { getGoogleCalendarConnection, listUpcomingGoogleCalendarEvents } from "@/lib/google-calendar";

export default async function ProjetosPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as Project[];

  let calendarEvents: Awaited<ReturnType<typeof listUpcomingGoogleCalendarEvents>> = [];
  let calendarConnected = false;
  let calendarError: string | null = null;

  if (user) {
    const connection = await getGoogleCalendarConnection(user.id);
    calendarConnected = Boolean(connection);
    if (connection) {
      try {
        calendarEvents = await listUpcomingGoogleCalendarEvents(connection.access_token, {
          days: 7,
        });
      } catch (error) {
        calendarError = error instanceof Error ? error.message : "Falha ao carregar a agenda";
      }
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <h1 className="font-display glow-text text-2xl font-bold tracking-wide">Projetos</h1>

      <GoogleCalendarPanel
        connected={calendarConnected}
        events={calendarEvents}
        error={calendarError}
      />

      <ProjectForm />

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">
            Nenhum projeto cadastrado.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-red-500/10">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="text-zinc-200">{project.name}</p>
                  {project.description && (
                    <p className="text-xs text-zinc-500">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ProjectStatusSelect id={project.id} status={project.status} />
                  <form action={deleteProject.bind(null, project.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
