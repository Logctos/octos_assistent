import { useMemo, useState } from "react";
import { createExpense } from "@/features/despesas/api";
import { FINANCE_CATEGORIES, type TransactionType } from "@/lib/finance-categories";

export function ExpenseForm({ onCreated }: { onCreated?: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>("expense");
  const [group, setGroup] = useState(Object.keys(FINANCE_CATEGORIES.expense)[0]);

  const groups = useMemo(() => Object.keys(FINANCE_CATEGORIES[type]), [type]);
  const subcategories = FINANCE_CATEGORIES[type][group] ?? FINANCE_CATEGORIES[type][groups[0]];

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setGroup(Object.keys(FINANCE_CATEGORIES[nextType])[0]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const { error: submitError } = await createExpense({
      type,
      category: group,
      subcategory: String(formData.get("subcategory") ?? ""),
      description: String(formData.get("description") ?? ""),
      amount: Number(formData.get("amount")),
    });

    setIsPending(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    e.currentTarget.reset();
    onCreated?.();
  }

  return (
    <form onSubmit={handleSubmit} className="hud-panel flex flex-col gap-3 rounded-sm p-4">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="type"
            value="expense"
            checked={type === "expense"}
            onChange={() => handleTypeChange("expense")}
            disabled={isPending}
          />
          Despesa
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="type"
            value="income"
            checked={type === "income"}
            onChange={() => handleTypeChange("income")}
            disabled={isPending}
          />
          Receita
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex w-full flex-col gap-1 sm:w-44">
          <label htmlFor="category" className="text-xs text-zinc-500">
            Grupo
          </label>
          <select
            id="category"
            name="category"
            required
            disabled={isPending}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-44">
          <label htmlFor="subcategory" className="text-xs text-zinc-500">
            Subcategoria
          </label>
          <select
            id="subcategory"
            name="subcategory"
            required
            disabled={isPending}
            className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
          >
            {subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-32">
          <label htmlFor="amount" className="text-xs text-zinc-500">
            Valor (R$)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            disabled={isPending}
            className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
          />
        </div>

        <button type="submit" disabled={isPending} className="hud-button rounded-sm px-4 py-2 text-sm">
          {isPending ? "Adicionando…" : "Adicionar"}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-xs text-zinc-500">
          Observação (opcional)
        </label>
        <input
          id="description"
          name="description"
          disabled={isPending}
          placeholder="Ex: fatura de julho"
          className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
