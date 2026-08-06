"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface ActionState {
  error: string | null;
}

export async function createExpense(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();

  if (!description || !category || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Preencha descrição, categoria e um valor válido" };
  }

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    description,
    amount,
    category,
  });

  if (error) return { error: error.message };

  revalidatePath("/despesas");
  return { error: null };
}

export async function deleteExpense(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/despesas");
}
