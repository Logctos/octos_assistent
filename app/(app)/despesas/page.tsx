import { Fragment } from "react";
import Link from "next/link";
import type { Expense } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deleteExpense } from "./actions";
import { ExpenseForm } from "./expense-form";
import {
  FINANCE_CATEGORIES,
  FALLBACK_GROUP,
  isKnownSubcategory,
  type TransactionType,
} from "@/lib/finance-categories";

type GroupTotals = Record<string, Record<string, number>>;

function monthRange(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, mon - 1, 1)),
    end: new Date(Date.UTC(year, mon, 1)),
  };
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const label = new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function currency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function sumGroups(groups: GroupTotals) {
  return Object.values(groups).reduce(
    (sum, subs) => sum + Object.values(subs).reduce((s, v) => s + v, 0),
    0
  );
}

function renderGroups(groups: GroupTotals) {
  return Object.entries(groups).map(([group, subs]) => (
    <Fragment key={group}>
      <tr>
        <td className="pt-2 font-medium text-zinc-700">{group}</td>
        <td />
      </tr>
      {Object.entries(subs).map(([sub, amount]) => (
        <tr key={`${group}-${sub}`}>
          <td className="pl-4 text-zinc-500">{sub}</td>
          <td className="text-right text-zinc-800">{currency(amount)}</td>
        </tr>
      ))}
    </Fragment>
  ));
}

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth;
  const { start, end } = monthRange(month);

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  const expenses = (data ?? []) as Expense[];

  const totals: Record<TransactionType, GroupTotals> = { income: {}, expense: {} };
  for (const type of ["income", "expense"] as TransactionType[]) {
    for (const [group, subs] of Object.entries(FINANCE_CATEGORIES[type])) {
      totals[type][group] = Object.fromEntries(subs.map((s) => [s, 0]));
    }
  }

  for (const expense of expenses) {
    const type: TransactionType = expense.type === "income" ? "income" : "expense";
    const amount = Number(expense.amount);
    const matches =
      !!expense.subcategory && isKnownSubcategory(type, expense.category, expense.subcategory);

    const group = matches ? expense.category : FALLBACK_GROUP[type];
    const subcategory = matches
      ? expense.subcategory!
      : expense.subcategory || expense.category || "Outros";

    totals[type][group][subcategory] = (totals[type][group][subcategory] ?? 0) + amount;
  }

  const totalIncome = sumGroups(totals.income);
  const totalExpense = sumGroups(totals.expense);
  const result = totalIncome - totalExpense;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="hud-eyebrow">Módulo financeiro</span>
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-black">Despesas</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/despesas?month=${shiftMonth(month, -1)}`}
            className="hud-button rounded-sm px-2 py-1 text-xs"
          >
            ←
          </Link>
          <span className="text-zinc-900">{formatMonthLabel(month)}</span>
          <Link
            href={`/despesas?month=${shiftMonth(month, 1)}`}
            className="hud-button rounded-sm px-2 py-1 text-xs"
          >
            →
          </Link>
        </div>
      </div>

      <ExpenseForm />

      <div className="hud-panel overflow-x-auto rounded-sm p-4 text-sm">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-[#0084FF]/15 text-left font-mono text-[11px] tracking-wider text-[#0084FF]/70 uppercase">
              <th className="pb-2 font-semibold">Descrição</th>
              <th className="pb-2 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2} className="pt-3 pb-1 font-semibold text-zinc-900">
                RECEITAS
              </td>
            </tr>
            {renderGroups(totals.income)}
            <tr className="border-t border-black/10 font-semibold text-zinc-900">
              <td className="pt-2">TOTAL DE RECEITAS</td>
              <td className="pt-2 text-right">{currency(totalIncome)}</td>
            </tr>

            <tr>
              <td colSpan={2} className="pt-5 pb-1 font-semibold text-zinc-900">
                DESPESAS
              </td>
            </tr>
            {renderGroups(totals.expense)}
            <tr className="border-t border-black/10 font-semibold text-zinc-900">
              <td className="pt-2">TOTAL DE DESPESAS</td>
              <td className="pt-2 text-right">{currency(totalExpense)}</td>
            </tr>

            <tr className={result >= 0 ? "text-emerald-600" : "text-red-600"}>
              <td className="pt-4 font-semibold">RESULTADO DO PERÍODO</td>
              <td className="pt-4 text-right font-semibold">{currency(result)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="hud-panel flex flex-col gap-2 rounded-sm p-4">
        <p className="border-b border-black/10 pb-2 text-sm text-zinc-500">Lançamentos do período</p>

        {expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Nenhum lançamento neste mês.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="text-zinc-800">{expense.description}</p>
                  <p className="text-xs text-zinc-500">
                    {expense.category}
                    {expense.subcategory ? ` · ${expense.subcategory}` : ""} ·{" "}
                    {new Date(expense.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={expense.type === "income" ? "text-emerald-600" : "text-zinc-800"}>
                    {expense.type === "income" ? "+" : "-"}
                    {currency(Number(expense.amount))}
                  </span>
                  <form action={deleteExpense.bind(null, expense.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:text-red-700">
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
