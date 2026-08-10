import { supabase } from "@/lib/supabase";
import type { Project } from "@/types";

export async function listProjects(): Promise<Project[]> {
  const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Project[];
}

export async function createProject(input: {
  name: string;
  description: string;
  category: Project["category"];
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) return { error: "Preencha o nome do projeto" };

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    description: description || null,
    category: input.category,
  });

  return { error: error?.message ?? null };
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateProjectStatus(id: string, status: Project["status"]): Promise<void> {
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
