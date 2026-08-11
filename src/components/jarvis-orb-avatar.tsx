import { useEffect, useRef, useState } from "react";
import { OctosAvatar } from "@/components/octos-avatar";

export type AvatarStatus = "idle" | "listening" | "thinking" | "speaking";

const COLOR_PRIMARY = "0, 212, 255"; // #00d4ff
const COLOR_ACCENT = "255, 107, 0"; // #ff6b00
const COLOR_GOLD = "255, 209, 102"; // #ffd166

interface StateParams {
  haloBase: number;
  haloAmp: number;
  haloSpeed: number;
  ringSpeed: number;
  scanSpeed: number;
  particleRate: number;
  waveAmp: number;
  color: string;
}

const STATE_PARAMS: Record<AvatarStatus, StateParams> = {
  idle: {
    haloBase: 0.16,
    haloAmp: 0.03,
    haloSpeed: 0.9,
    ringSpeed: 0.35,
    scanSpeed: 0.5,
    particleRate: 0,
    waveAmp: 0.06,
    color: COLOR_PRIMARY,
  },
  listening: {
    haloBase: 0.28,
    haloAmp: 0.08,
    haloSpeed: 1.7,
    ringSpeed: 0.65,
    scanSpeed: 1.0,
    particleRate: 0,
    waveAmp: 0.16,
    color: COLOR_PRIMARY,
  },
  thinking: {
    haloBase: 0.24,
    haloAmp: 0.06,
    haloSpeed: 2.6,
    ringSpeed: 1.15,
    scanSpeed: 1.5,
    particleRate: 0,
    waveAmp: 0.09,
    color: COLOR_GOLD,
  },
  speaking: {
    haloBase: 0.42,
    haloAmp: 0.16,
    haloSpeed: 3.1,
    ringSpeed: 1.5,
    scanSpeed: 2.3,
    particleRate: 5.5,
    waveAmp: 0.32,
    color: COLOR_ACCENT,
  },
};

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  life: number;
}

/**
 * Canvas-drawn JARVIS-style HUD ring: layered halo glow, spinning arc rings,
 * a scanning arc, and a reactive waveform, wrapped around the original Octos
 * (Spline) avatar at its center. Purely visual — driven entirely by the
 * `status` prop, no app logic here.
 */
export function JarvisOrbAvatar({
  status,
  size,
}: {
  status: AvatarStatus;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarWrapRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const statusRef = useRef(status);
  statusRef.current = status;
  const [avatarPx, setAvatarPx] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    const start = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      setAvatarPx(Math.min(rect.width, rect.height) * 0.5);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement!);

    function draw(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      const cx = w / 2;
      const cy = h / 2;
      const fw = Math.min(w, h);
      const t = (now - start) / 1000;
      const params = STATE_PARAMS[statusRef.current];

      ctx!.clearRect(0, 0, w, h);

      const haloPulse = params.haloBase + params.haloAmp * Math.sin(t * params.haloSpeed);
      const rFace = fw * 0.24;

      // Float the avatar itself inside the ring: a slow bob/sway always running,
      // synced to the same halo-pulse "breathing", plus a jitter while speaking.
      if (avatarWrapRef.current) {
        const bobSpeed = params.haloSpeed * 0.55;
        const bobPx = Math.sin(t * bobSpeed) * 5;
        const swayPx = Math.cos(t * bobSpeed * 0.6) * 3;
        const jitterPx = statusRef.current === "speaking" ? Math.sin(t * 16) * 1.4 : 0;
        const scale = 1 + haloPulse * 0.05;
        avatarWrapRef.current.style.transform =
          `translate(${(swayPx + jitterPx).toFixed(2)}px, ${bobPx.toFixed(2)}px) scale(${scale.toFixed(3)})`;
      }

      // Halo glow: concentric fading rings
      for (let i = 0; i < 8; i++) {
        const r = rFace * (1.6 - i * 0.09) + fw * haloPulse * 0.02;
        const frac = 1 - i / 8;
        ctx!.beginPath();
        ctx!.arc(cx, cy, Math.max(r, 0), 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${params.color}, ${(haloPulse * 0.5 * frac).toFixed(3)})`;
        ctx!.lineWidth = fw * 0.004;
        ctx!.stroke();
      }

      // Pulse rings expanding outward, looping
      const pulseSpeed = params.haloSpeed * 0.5;
      for (let i = 0; i < 2; i++) {
        const phase = ((t * pulseSpeed + i * 0.5) % 1.6) / 1.6;
        const r = rFace * (1 + phase * 1.4);
        const alpha = (1 - phase) * 0.25;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${params.color}, ${alpha.toFixed(3)})`;
        ctx!.lineWidth = fw * 0.003;
        ctx!.stroke();
      }

      // Spinning arc rings
      const ringSpecs = [
        { rf: 0.46, width: 0.01, dir: 1, segs: 3, arc: 0.55 },
        { rf: 0.38, width: 0.008, dir: -1, segs: 4, arc: 0.4 },
        { rf: 0.31, width: 0.007, dir: 1, segs: 5, arc: 0.3 },
      ];
      for (const spec of ringSpecs) {
        const r = fw * spec.rf;
        const rot = t * params.ringSpeed * spec.dir;
        ctx!.lineWidth = fw * spec.width;
        ctx!.strokeStyle = `rgba(${params.color}, 0.55)`;
        for (let s = 0; s < spec.segs; s++) {
          const segStart = rot + (s / spec.segs) * Math.PI * 2;
          const segEnd = segStart + (spec.arc / spec.segs) * Math.PI * 2;
          ctx!.beginPath();
          ctx!.arc(cx, cy, r, segStart, segEnd);
          ctx!.stroke();
        }
      }

      // Scanning arcs (primary + accent)
      const scanRot = t * params.scanSpeed;
      ctx!.lineWidth = fw * 0.012;
      ctx!.strokeStyle = `rgba(${params.color}, 0.8)`;
      ctx!.beginPath();
      ctx!.arc(cx, cy, fw * 0.42, scanRot, scanRot + 0.9);
      ctx!.stroke();

      ctx!.strokeStyle = `rgba(${COLOR_ACCENT}, 0.35)`;
      ctx!.beginPath();
      ctx!.arc(cx, cy, fw * 0.42, scanRot + Math.PI, scanRot + Math.PI + 0.6);
      ctx!.stroke();

      // Waveform bars along the lower third of the orb
      const barCount = 28;
      const waveWidth = fw * 0.62;
      const barW = waveWidth / barCount / 1.6;
      const baseY = cy + rFace * 1.55;
      for (let i = 0; i < barCount; i++) {
        const bx = cx - waveWidth / 2 + (i / (barCount - 1)) * waveWidth;
        const isSpeaking = statusRef.current === "speaking";
        const noise = isSpeaking
          ? Math.abs(Math.sin(t * 9 + i * 1.7)) * Math.random()
          : Math.abs(Math.sin(t * 2 + i * 0.5));
        const barH = fw * params.waveAmp * (0.25 + noise * 0.75);
        ctx!.fillStyle = `rgba(${params.color}, ${0.25 + noise * 0.5})`;
        ctx!.fillRect(bx - barW / 2, baseY - barH / 2, barW, barH);
      }

      // Particles (speaking only)
      if (params.particleRate > 0 && Math.random() < params.particleRate * 0.05) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: rFace * 1.1,
          speed: fw * (0.15 + Math.random() * 0.2),
          life: 1,
        });
      }
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      for (const p of particlesRef.current) {
        p.radius += p.speed * 0.016;
        p.life -= 0.02;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;
        ctx!.beginPath();
        ctx!.arc(px, py, fw * 0.006, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${params.color}, ${Math.max(p.life, 0)})`;
        ctx!.fill();
      }

      frameId = requestAnimationFrame(draw);
    }

    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={
        size
          ? "relative h-full w-full"
          : "relative h-36 w-36 sm:h-44 sm:w-44 lg:h-[220px] lg:w-[220px]"
      }
      style={size ? { width: size, height: size } : undefined}
    >
      <div ref={avatarWrapRef} className="absolute inset-0 flex items-center justify-center will-change-transform">
        {avatarPx > 0 && <OctosAvatar size={avatarPx} />}
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
