import { useTransition } from "react";
import { updateProjectStatus } from "@/features/projetos/api";
import type { Project } from "@/types";

const STATUS_LABELS: Record<Project["status"], string> = {
  active: "Ativo",
  paused: "Pausado",
  done: "Concluído",
};

export function ProjectStatusSelect({
  id,
  status,
  onChanged,
}: {
  id: string;
  status: Project["status"];
  onChanged?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as Project["status"];
        startTransition(async () => {
          await updateProjectStatus(id, next);
          onChanged?.();
        });
      }}
      className="hud-input rounded-sm px-2 py-1 text-xs text-zinc-100 disabled:cursor-not-allowed"
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
