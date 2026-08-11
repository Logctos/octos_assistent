import { useEffect, useState } from "react";
import type { DailySummary } from "@/types";
import { listYesterdaySummaries } from "@/features/diario/api";

export function YesterdaySummaryCard() {
  const [summaries, setSummaries] = useState<DailySummary[] | null>(null);

  useEffect(() => {
    listYesterdaySummaries().then(setSummaries);
  }, []);

  if (!summaries || summaries.length === 0) return null;

  return (
    <div className="hud-panel flex w-full flex-col gap-2 rounded-sm p-4">
      <span className="hud-eyebrow">Resumo de ontem</span>
      <ul className="flex flex-col gap-2">
        {summaries.map((s) => (
          <li key={s.id} className="text-sm text-zinc-300">
            {s.content}
          </li>
        ))}
      </ul>
    </div>
  );
}
