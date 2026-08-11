import { useState } from "react";
import { createProject } from "@/features/projetos/api";

export function ProjectForm({ onCreated }: { onCreated?: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const { error: submitError } = await createProject({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: (formData.get("category") as "trabalho" | "estudos" | "ambas" | null) ?? "trabalho",
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
    <form
      onSubmit={handleSubmit}
      className="hud-panel flex flex-col gap-3 rounded-sm p-4 sm:flex-row sm:items-end"
    >
      <div className="flex w-full flex-col gap-1 sm:w-48">
        <label htmlFor="name" className="text-xs text-zinc-400">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          disabled={isPending}
          className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="description" className="text-xs text-zinc-400">
          Descrição (opcional)
        </label>
        <input
          id="description"
          name="description"
          disabled={isPending}
          className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
        />
      </div>

      <div className="flex w-full flex-col gap-1 sm:w-32">
        <label htmlFor="category" className="text-xs text-zinc-400">
          Categoria
        </label>
        <select
          id="category"
          name="category"
          disabled={isPending}
          defaultValue="trabalho"
          className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
        >
          <option value="trabalho">Trabalho</option>
          <option value="estudos">Estudos</option>
          <option value="ambas">Ambas</option>
        </select>
      </div>

      <button type="submit" disabled={isPending} className="hud-button rounded-sm px-4 py-2 text-sm">
        {isPending ? "Adicionando…" : "Adicionar"}
      </button>

      {error && <p className="text-sm text-red-400 sm:basis-full">{error}</p>}
    </form>
  );
}
