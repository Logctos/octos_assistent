import { useEffect, useRef } from "react";
import { SplineScene } from "@/components/ui/spline";
import type { Application, SPEObject } from "@splinetool/runtime";

const SCENE_SRC = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";
const HEAD_NAME_PATTERN = /head|cabe[çc]a|face|rosto/i;
const MAX_TILT_RAD = (18 * Math.PI) / 180;

export function OctosAvatar({ size }: { size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<SPEObject | null>(null);
  const baseRotationRef = useRef({ x: 0, y: 0 });
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerSmoothRef = useRef({ x: 0, y: 0 });

  // Finds the head object inside the Spline scene graph so only it turns toward the
  // cursor — rotating the whole scene's container would tilt the entire avatar instead.
  function handleSplineLoad(app: Application) {
    const objects = app.getAllObjects();
    const head = objects.find((object) => HEAD_NAME_PATTERN.test(object.name));

    if (!head) {
      console.warn(
        '[OctosAvatar] Nenhum objeto de "cabeça" encontrado na cena Spline — o acompanhamento do ' +
          "mouse fica desativado. Nomes disponíveis na cena:",
        objects.map((object) => object.name)
      );
      return;
    }

    headRef.current = head;
    baseRotationRef.current = { x: head.rotation.x, y: head.rotation.y };
  }

  useEffect(() => {
    const query = window.matchMedia?.("(any-pointer: fine)");
    if (query && !query.matches) return;

    function handlePointerMove(e: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;

      pointerTargetRef.current = { x: dx * MAX_TILT_RAD, y: dy * MAX_TILT_RAD };
    }
    window.addEventListener("pointermove", handlePointerMove);

    let frameId = 0;
    function tick() {
      const head = headRef.current;
      if (head) {
        pointerSmoothRef.current.x += (pointerTargetRef.current.x - pointerSmoothRef.current.x) * 0.08;
        pointerSmoothRef.current.y += (pointerTargetRef.current.y - pointerSmoothRef.current.y) * 0.08;
        head.rotation.y = baseRotationRef.current.y + pointerSmoothRef.current.x;
        head.rotation.x = baseRotationRef.current.x - pointerSmoothRef.current.y;
      }
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={
        size
          ? "octos-avatar relative h-full w-full overflow-hidden rounded-[32px] bg-black/[0.96] shadow-xl"
          : "octos-avatar relative h-36 w-36 overflow-hidden rounded-[32px] bg-black/[0.96] shadow-xl sm:h-44 sm:w-44 lg:h-[220px] lg:w-[220px]"
      }
      style={size ? { width: size, height: size } : undefined}
    >
      <SplineScene scene={SCENE_SRC} className="h-full w-full" onLoad={handleSplineLoad} />
    </div>
  );
}
