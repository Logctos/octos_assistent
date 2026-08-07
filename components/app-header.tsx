"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { HudClock } from "@/components/hud-clock";
import { ConnectGoogleCalendarButton } from "@/components/connect-google-calendar-button";

const NAV_ITEMS = [
  { href: "/app", label: "Chat" },
  { href: "/despesas", label: "Despesas" },
  { href: "/projetos", label: "Projetos" },
];

export function AppHeader({
  userEmail,
  googleCalendarConnected,
}: {
  userEmail?: string | null;
  googleCalendarConnected?: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="flex w-full max-w-2xl items-center justify-between border-b border-[#0084FF]/10 pb-4 text-sm">
      <div className="flex items-center gap-6">
        <Link
          href="/app"
          className="font-fustat flex items-center gap-2 text-lg font-extrabold tracking-tight text-black"
        >
          <Bot className="h-5 w-5 text-[#0084FF] drop-shadow-[0_0_6px_rgba(0,132,255,0.5)]" />
          Octos.
        </Link>
        <nav className="flex gap-8">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative pb-1 font-mono text-xs font-semibold tracking-widest uppercase transition-colors ${
                  active ? "text-[#0084FF]" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-[17px] left-0 h-[2px] w-full bg-[#0084FF] shadow-[0_0_6px_1px_rgba(0,132,255,0.6)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-5">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="arc-reactor" />
          <span className="font-mono text-xs tracking-widest text-[#0084FF]/70">ONLINE</span>
          <HudClock />
        </div>
        {userEmail && (
          <div className="border-l border-[#0084FF]/15 pl-5">
            <ConnectGoogleCalendarButton connected={Boolean(googleCalendarConnected)} />
          </div>
        )}
        {userEmail && (
          <div className="flex items-center gap-3 border-l border-[#0084FF]/15 pl-5 text-xs text-zinc-600">
            <span>{userEmail}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
