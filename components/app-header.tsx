"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
        <Link href="/app" className="flex items-center gap-2">
          <span className="arc-reactor" />
          <span className="font-display glow-text text-sm font-bold tracking-widest">
            OCTOS
          </span>
        </Link>
        <nav className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href
                  ? "text-red-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_2px_rgba(239,68,68,0.7)]" />
          <span className="font-mono text-xs tracking-widest text-red-400/70">ONLINE</span>
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
