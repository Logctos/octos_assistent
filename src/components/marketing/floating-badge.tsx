"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function FloatingBadge({
  icon: Icon,
  title,
  subtitle,
  className,
  gradient,
  shadowColor,
  floatY,
  floatX,
  duration,
  hoverRotate,
  delay,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  className: string;
  gradient: string;
  shadowColor: string;
  floatY: number;
  floatX: number;
  duration: number;
  hoverRotate: number;
  delay: number;
}) {
  return (
    <motion.div
      className={`absolute pointer-events-auto ${className}`}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -floatY, 0],
        x: [0, floatX, 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { type: "spring", damping: 20, stiffness: 100, delay },
        y: { duration, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 },
        x: { duration, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 },
      }}
      whileHover={{ scale: 1.05, rotate: hoverRotate }}
    >
      <div
        className="flex items-center gap-3 rounded-[20px] border border-white/70 bg-gradient-to-br from-white/75 to-white/45 px-5 py-3 backdrop-blur-[20px] ring-1 ring-black/5 shadow-[inset_0_2.5px_4px_rgba(255,255,255,0.8)]"
        style={{ boxShadow: `0 12px 32px -4px ${shadowColor}` }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: gradient, boxShadow: `0 4px 12px ${shadowColor}` }}
        >
          <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col text-left leading-tight">
          <span className="font-inter text-[13px] font-black tracking-tight text-neutral-900">
            {title}
          </span>
          <span className="font-inter mt-0.5 text-[10px] font-semibold text-neutral-500">
            {subtitle}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
