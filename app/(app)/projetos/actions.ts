"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Project } from "@/types";

interface ActionState {
  error: string | null;
}

export async function createProject(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Preencha o nome do projeto" };

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    description: description || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/projetos");
  return { error: null };
}

export async function deleteProject(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/projetos");
}

export async function updateProjectStatus(id: string, status: Project["status"]) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/projetos");
}
