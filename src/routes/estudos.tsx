import { StudyPlanPanel } from "@/features/estudos/study-plan-panel";

export function EstudosPage() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="hud-eyebrow">Cronograma de estudos</span>
        <h1 className="font-outfit text-2xl font-bold tracking-tight text-zinc-50">Estudos</h1>
        <p className="text-sm text-zinc-400">
          Diga os temas no chat (ex: &quot;monta um plano de estudos de React e Inglês&quot;) e o
          Octos monta o cronograma, agenda as sessões e acompanha sua eficiência aqui.
        </p>
      </div>

      <StudyPlanPanel />
    </div>
  );
}
