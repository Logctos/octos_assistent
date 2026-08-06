import type { Expense } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deleteExpense } from "./actions";
import { ExpenseForm } from "./expense-form";

export default async function DespesasPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  const expenses = (data ?? []) as Expense[];
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <h1 className="font-display glow-text text-2xl font-bold tracking-wide">Despesas</h1>

      <ExpenseForm />

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        <div className="flex items-center justify-between border-b border-red-500/20 pb-2 text-sm text-zinc-400">
          <span>Total</span>
          <span className="text-zinc-100">
            R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">
            Nenhuma despesa registrada.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-red-500/10">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="text-zinc-200">{expense.description}</p>
                  <p className="text-xs text-zinc-500">
                    {expense.category} ·{" "}
                    {new Date(expense.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-200">
                    R${" "}
                    {Number(expense.amount).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <form action={deleteExpense.bind(null, expense.id)}>
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
