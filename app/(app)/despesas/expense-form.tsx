"use client";

import { useActionState } from "react";
import { createExpense } from "./actions";

const initialState = { error: null as string | null };

export function ExpenseForm() {
  const [state, formAction, isPending] = useActionState(createExpense, initialState);

  return (
    <form
      action={formAction}
      className="hud-panel flex flex-col gap-3 rounded-sm p-4 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="description" className="text-xs text-zinc-500">
          Descrição
        </label>
        <input
          id="description"
          name="description"
          required
          disabled={isPending}
          className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-200 disabled:cursor-not-allowed"
        />
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
          className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-200 disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex w-full flex-col gap-1 sm:w-40">
        <label htmlFor="category" className="text-xs text-zinc-500">
          Categoria
        </label>
        <input
          id="category"
          name="category"
          required
          disabled={isPending}
          className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-200 disabled:cursor-not-allowed"
        />
      </div>

      <button type="submit" disabled={isPending} className="hud-button rounded-sm px-4 py-2 text-sm">
        {isPending ? "Adicionando…" : "Adicionar"}
      </button>

      {state.error && (
        <p className="text-sm text-red-400 sm:basis-full">{state.error}</p>
      )}
    </form>
  );
}
