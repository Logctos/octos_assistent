"use client";

import { motion } from "framer-motion";
import { Calendar, Wallet, ListChecks } from "lucide-react";
import { OctosAvatar } from "@/components/octos-avatar";
import { JarvisFrame } from "@/components/jarvis-frame";
import { FloatingBadge } from "@/components/marketing/floating-badge";

export function HeroVisual() {
  return (
    <div className="pointer-events-none relative flex w-full items-center justify-center py-10 lg:justify-end">
      <motion.div
        className="relative flex h-[280px] w-[280px] items-center justify-center sm:h-[360px] sm:w-[360px] md:h-[440px] md:w-[440px] lg:h-[520px] lg:w-[520px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <JarvisFrame className="pointer-events-auto h-full w-full">
          <OctosAvatar />
        </JarvisFrame>

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
