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
    <header className="flex w-full max-w-2xl items-center justify-between text-sm">
      <div className="flex items-center gap-6">
        <Link href="/app" className="font-fustat flex items-center gap-2 text-lg font-extrabold tracking-tight text-black">
          <Bot className="h-5 w-5 text-[#0084FF]" />
          Octos.
        </Link>
        <nav className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href
                  ? "font-medium text-[#0084FF]"
                  : "text-zinc-500 hover:text-zinc-900"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="arc-reactor" />
          <span className="font-mono text-xs tracking-widest text-[#0084FF]/70">ONLINE</span>
          <HudClock />
        </div>
        {userEmail && <ConnectGoogleCalendarButton connected={Boolean(googleCalendarConnected)} />}
        {userEmail && (
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span>{userEmail}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
