import { useState } from "react";
import { createHealthLog } from "@/features/saude/api";

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function HealthForm({
  onCreated,
  suggestedSleepHours,
}: {
  onCreated?: () => void;
  suggestedSleepHours?: number | null;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const weight = formData.get("weight");
    const activity = formData.get("activity");
    const sleep = formData.get("sleep");

    const { error: submitError } = await createHealthLog({
      logDate: String(formData.get("logDate") ?? todayISO()),
      weightKg: weight ? Number(weight) : null,
      activityMinutes: activity ? Number(activity) : null,
      sleepHours: sleep ? Number(sleep) : null,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex w-full flex-col gap-1 sm:w-36">
          <label htmlFor="logDate" className="text-xs text-zinc-400">
            Data
          </label>
          <input
            id="logDate"
            name="logDate"
            type="date"
            defaultValue={todayISO()}
            disabled={isPending}
            className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
          />
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-32">
          <label htmlFor="weight" className="text-xs text-zinc-400">
            Peso (kg)
          </label>
          <input
            id="weight"
            name="weight"
            type="number"
            step="0.1"
            min="0"
            disabled={isPending}
            className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
          />
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-40">
          <label htmlFor="activity" className="text-xs text-zinc-400">
            Atividade física (min)
          </label>
          <input
            id="activity"
            name="activity"
            type="number"
            step="1"
            min="0"
            disabled={isPending}
            className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
          />
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-32">
          <label htmlFor="sleep" className="text-xs text-zinc-400">
            Sono (h)
          </label>
          <input
            id="sleep"
            name="sleep"
            type="number"
            step="0.1"
            min="0"
            max="24"
            defaultValue={suggestedSleepHours ?? undefined}
            disabled={isPending}
            className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
          />
        </div>

        <button type="submit" disabled={isPending} className="hud-button rounded-sm px-4 py-2 text-sm">
          {isPending ? "Adicionando…" : "Adicionar"}
        </button>
      </div>

      {suggestedSleepHours != null && (
        <p className="text-xs text-zinc-500">
          Sono preenchido automaticamente com base no tempo desde seu último acesso ao app
          ({suggestedSleepHours.toFixed(1)}h) — ajuste se não bater com a realidade.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
