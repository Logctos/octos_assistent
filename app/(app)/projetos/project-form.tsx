"use client";

import { useActionState } from "react";
import { createProject } from "./actions";

const initialState = { error: null as string | null };

export function ProjectForm() {
  const [state, formAction, isPending] = useActionState(createProject, initialState);

  return (
    <form
      action={formAction}
      className="hud-panel flex flex-col gap-3 rounded-sm p-4 sm:flex-row sm:items-end"
    >
      <div className="flex w-full flex-col gap-1 sm:w-48">
        <label htmlFor="name" className="text-xs text-zinc-500">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          disabled={isPending}
          className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="description" className="text-xs text-zinc-500">
          Descrição (opcional)
        </label>
        <input
          id="description"
          name="description"
          disabled={isPending}
          className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
        />
      </div>

      <button type="submit" disabled={isPending} className="hud-button rounded-sm px-4 py-2 text-sm">
        {isPending ? "Adicionando…" : "Adicionar"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 sm:basis-full">{state.error}</p>
      )}
    </form>
  );
}
