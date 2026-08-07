"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { FINANCE_CATEGORIES, type TransactionType } from "@/lib/finance-categories";

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

  const type = String(formData.get("type") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (type !== "income" && type !== "expense") {
    return { error: "Tipo inválido" };
  }

  const validSubcategories = FINANCE_CATEGORIES[type as TransactionType][category];
  if (!validSubcategories || !validSubcategories.includes(subcategory)) {
    return { error: "Grupo/subcategoria inválidos" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Informe um valor válido" };
  }

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    description: description || subcategory,
    amount,
    category,
    subcategory,
    type,
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
