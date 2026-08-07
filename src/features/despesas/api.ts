import { supabase } from "@/lib/supabase";
import { FINANCE_CATEGORIES, type TransactionType } from "@/lib/finance-categories";
import type { Expense } from "@/types";

export async function listExpensesForMonth(month: string): Promise<Expense[]> {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));

  const { data } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  return (data ?? []) as Expense[];
}

export async function createExpense(input: {
  type: string;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { type, category, subcategory, description, amount } = input;

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
    description: description.trim() || subcategory,
    amount,
    category,
    subcategory,
    type,
  });

  return { error: error?.message ?? null };
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
