import { SplineScene } from "@/components/ui/spline";

const SCENE_SRC = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

export function OctosAvatar({ size }: { size?: number }) {
  return (
    <div
      className="octos-avatar relative h-full w-full overflow-hidden rounded-[32px] bg-black/[0.96] shadow-xl"
      style={size ? { width: size, height: size } : undefined}
    >
      <SplineScene scene={SCENE_SRC} className="h-full w-full" />
    </div>
  );
}
