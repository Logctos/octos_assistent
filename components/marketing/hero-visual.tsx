"use client";

import { motion } from "framer-motion";
import { Calendar, Wallet, ListChecks } from "lucide-react";
import { HeroVideoAvatar } from "@/components/marketing/hero-video-avatar";
import { FloatingBadge } from "@/components/marketing/floating-badge";

export function HeroVisual() {
  return (
    <div className="pointer-events-none relative flex w-full items-center justify-center py-10 lg:justify-end">
      {/* ambient aura */}
      <div className="absolute left-[20%] top-[30%] -z-10 h-[420px] w-[420px] animate-pulse rounded-full bg-sky-400/15 blur-[110px] [animation-duration:7000ms]" />

      {/* orbital rings */}
      <svg
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[620px] w-[620px] -translate-x-1/2 -translate-y-[52%] opacity-35"
        viewBox="0 0 620 620"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="orbit-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60B1FF" />
            <stop offset="100%" stopColor="#319AFF" />
          </linearGradient>
        </defs>
        <circle cx="310" cy="310" r="300" fill="none" stroke="url(#orbit-gradient)" strokeWidth="1" strokeDasharray="2 10" />
        <circle cx="310" cy="310" r="250" fill="none" stroke="url(#orbit-gradient)" strokeWidth="1" strokeDasharray="1 6" />
      </svg>

      <motion.div
        className="relative flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <div className="pointer-events-auto">
          <HeroVideoAvatar size={440} />
        </div>

        <FloatingBadge
          icon={Calendar}
          title="Marcar reunião"
          subtitle="na agenda"
          className="top-[10%] -right-4 sm:-right-10 md:-right-14"
          gradient="linear-gradient(to bottom right, #0084FF, #0066CC)"
          shadowColor="rgba(0,132,255,0.25)"
          floatY={8}
          floatX={2}
          duration={5}
          hoverRotate={1}
          delay={0.6}
        />

        <FloatingBadge
          icon={Wallet}
          title="Registrar"
          subtitle="uma despesa"
          className="top-[48%] -left-6 sm:-left-12 md:-left-16"
          gradient="linear-gradient(to bottom right, #10B981, #059669)"
          shadowColor="rgba(16,185,129,0.25)"
          floatY={8}
          floatX={-2}
          duration={5.5}
          hoverRotate={-1}
          delay={0.8}
        />

        <FloatingBadge
          icon={ListChecks}
          title="Criar um projeto"
          subtitle="em segundos"
          className="bottom-[10%] -right-4 sm:-right-8 md:-right-12"
          gradient="linear-gradient(to bottom right, #9333EA, #7E22CE)"
          shadowColor="rgba(147,51,234,0.25)"
          floatY={10}
          floatX={-1}
          duration={4.8}
          hoverRotate={1.5}
          delay={1}
        />
      </motion.div>
    </div>
  );
}
