"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#recursos", label: "Recursos" },
  { href: "#sobre", label: "Empresa" },
  { href: "#precos", label: "Preços" },
];

export function MarketingNavbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 right-0 top-[30px] z-50 flex justify-center px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="pointer-events-auto flex h-12 w-full max-w-[1280px] items-center justify-between gap-8 rounded-[16px] px-6 py-2">
          <Link to="#inicio" className="font-fustat flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-black">
            <Bot className="h-6 w-6 text-[#0084FF]" />
            Octos.
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-inter text-[14px] font-medium text-black/60 transition-colors hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link
            to="/login"
            className="group hidden h-9 items-center gap-2 rounded-[12px] border border-black/10 bg-black/5 px-5 text-[14px] font-semibold text-black transition-all hover:bg-black/10 hover:shadow-md md:flex"
          >
            Entrar
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-black/10 bg-black/5 text-black md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/20 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 z-50 h-full w-[260px] border-l border-black/10 bg-white/95 backdrop-blur-[40px] md:hidden"
              initial={{ x: 260 }}
              animate={{ x: 0 }}
              exit={{ x: 260 }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
            >
              <div className="flex items-center justify-between px-6 py-5">
                <span className="font-fustat text-[18px] font-extrabold text-black">Octos.</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fechar menu"
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-black/10 text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className="font-inter py-3 text-[15px] font-medium text-black/70 hover:text-black"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  className="font-inter mt-3 flex items-center justify-center gap-2 rounded-[12px] bg-[#0084FF] py-2.5 text-[14px] font-semibold text-white"
                >
                  Entrar
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
