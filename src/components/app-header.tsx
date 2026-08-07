import { Link, useLocation } from "react-router-dom";
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
  const { pathname } = useLocation();

  return (
    <header className="flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[#0084FF]/10 pb-4 text-sm">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          to="/app"
          className="font-fustat flex items-center gap-2 text-lg font-extrabold tracking-tight text-black"
        >
          <Bot className="h-5 w-5 text-[#0084FF] drop-shadow-[0_0_6px_rgba(0,132,255,0.5)]" />
          Octos.
        </Link>
        <nav className="flex flex-wrap gap-4 sm:gap-8">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
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
      <div className="flex flex-wrap items-center gap-3 sm:gap-5">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="arc-reactor" />
          <span className="font-mono text-xs tracking-widest text-[#0084FF]/70">ONLINE</span>
          <HudClock />
        </div>
        {userEmail && (
          <div className="sm:border-l sm:border-[#0084FF]/15 sm:pl-5">
            <ConnectGoogleCalendarButton connected={Boolean(googleCalendarConnected)} />
          </div>
        )}
        {userEmail && (
          <div className="flex items-center gap-3 text-xs text-zinc-600 sm:border-l sm:border-[#0084FF]/15 sm:pl-5">
            <span className="hidden sm:inline">{userEmail}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
