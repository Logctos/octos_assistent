"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "@/app/(app)/projetos/actions";
import type { Project } from "@/types";

const STATUS_LABELS: Record<Project["status"], string> = {
  active: "Ativo",
  paused: "Pausado",
  done: "Concluído",
};

export function ProjectStatusSelect({ id, status }: { id: string; status: Project["status"] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as Project["status"];
        startTransition(() => {
          updateProjectStatus(id, next);
        });
      }}
      className="hud-input rounded-sm px-2 py-1 text-xs text-zinc-900 disabled:cursor-not-allowed"
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
