"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Play, Bot, Calendar, Wallet, FolderKanban, MessageSquare } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { HeroVisual } from "@/components/marketing/hero-visual";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Chat com IA",
    description: "Converse com o Octos em português, peça recomendações diretas e mande ele executar tarefas por você.",
  },
  {
    icon: Calendar,
    title: "Google Agenda",
    description: "Conecte sua conta e peça pro Octos criar, listar e organizar seus compromissos direto na conversa.",
  },
  {
    icon: Wallet,
    title: "Despesas",
    description: "Registre gastos por categoria e acompanhe pra onde o dinheiro está indo, sem precisar de planilha.",
  },
  {
    icon: FolderKanban,
    title: "Projetos",
    description: "Organize o que está em andamento, pausado ou concluído — tudo visível numa lista simples.",
  },
];

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-white font-inter">
      <MarketingNavbar />

      <main id="inicio" className="mx-auto w-full max-w-[1280px] px-6 pt-[110px] sm:px-12 sm:pt-[130px] lg:px-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <motion.div
            className="flex max-w-[620px] flex-col items-start justify-center text-left lg:col-span-5 lg:pr-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex w-fit items-center gap-3 rounded-full border border-black/5 bg-black/5 px-3 py-1.5 shadow-xs">
              <Bot className="h-4 w-4 text-[#0084FF]" />
              <span className="text-[12px] text-black/80">
                <span className="font-semibold text-[#171717]">Chat · Agenda · Despesas · Projetos</span> — tudo em um assistente
              </span>
            </div>

            <h1 className="font-outfit mt-6 select-none text-[36px] font-black leading-[1.08] tracking-[-3px] text-black sm:text-[44px] lg:text-[60px]">
              O assistente que cuida
              <br />
              da sua rotina inteira.
            </h1>

            <p className="mt-5 max-w-[480px] text-[18px] leading-relaxed tracking-[-0.5px] text-black/60">
              Pergunte, agende, controle despesas e organize projetos — tudo com o poder da IA, numa conversa só.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link
                href="/login"
                className="flex w-fit items-center gap-4 rounded-[16px] bg-[#0084FF] py-2 pl-6 pr-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#0074E0]"
                style={{
                  boxShadow:
                    "inset 0px 4px 4px 0px rgba(255,255,255,0.35), 0 10px 25px -5px rgba(0, 132, 255, 0.25)",
                }}
              >
                Experimentar Octos
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0084FF]">
                  <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>

              <a href="#recursos" className="group flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 transition-colors group-hover:bg-blue-100">
                  <Play className="h-3.5 w-3.5 fill-[#0084FF] text-[#0084FF]" />
                </span>
                <span className="text-[14px] font-bold text-[#0084FF] transition-colors group-hover:text-[#0074E0]">
                  Ver como funciona
                </span>
              </a>
            </div>
          </motion.div>

          <div className="lg:col-span-7">
            <HeroVisual />
          </div>
        </div>

        <section id="recursos" className="mx-auto mt-32 max-w-[1280px] pb-32">
          <h2 className="font-outfit text-center text-[28px] font-bold tracking-tight text-black sm:text-[34px]">
            Tudo o que o Octos já faz por você
          </h2>
          <p className="mx-auto mt-3 max-w-[480px] text-center text-[15px] leading-relaxed text-black/60">
            Recursos reais, disponíveis agora — não é uma lista de promessas.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[20px] border border-black/5 bg-gradient-to-br from-white to-neutral-50 p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0084FF] to-[#0066CC] shadow-[0_4px_12px_rgba(0,132,255,0.3)]">
                  <feature.icon className="h-5 w-5 text-white" strokeWidth={2.25} />
                </div>
                <h3 className="mt-4 text-[15px] font-bold tracking-tight text-neutral-900">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="sobre" className="mx-auto max-w-[620px] pb-24 text-center">
          <h2 className="font-outfit text-[22px] font-bold tracking-tight text-black">Sobre o Octos</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-black/60">
            Octos é um projeto pessoal — um assistente de IA construído pra organizar o dia a dia de quem o usa,
            sem depender de dezenas de apps diferentes.
          </p>
        </section>

        <section id="precos" className="mx-auto max-w-[620px] pb-32 text-center">
          <h2 className="font-outfit text-[22px] font-bold tracking-tight text-black">Preço</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-black/60">
            Gratuito para uso pessoal.
          </p>
        </section>
      </main>
    </div>
  );
}
