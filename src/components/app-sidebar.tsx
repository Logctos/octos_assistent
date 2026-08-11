import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { HudClock } from "@/components/hud-clock";
import { ConnectGoogleCalendarButton } from "@/components/connect-google-calendar-button";

const NAV_ITEMS = [
  { href: "/app", label: "Chat" },
  { href: "/despesas", label: "Despesas" },
  { href: "/projetos", label: "Projetos" },
  { href: "/estudos", label: "Estudos" },
  { href: "/saude", label: "Saúde" },
];

interface AppSidebarProps {
  userEmail?: string | null;
  googleCalendarConnected?: boolean;
}

export function AppSidebar({ userEmail, googleCalendarConnected }: AppSidebarProps) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <>
      <div
        className="flex items-center justify-between border-b border-[#00d4ff]/15 bg-[#04070c] px-4 py-3 md:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <Link to="/app" className="font-fustat flex items-center gap-2 text-base font-extrabold tracking-tight text-zinc-50">
          <Bot className="h-5 w-5 text-[#00d4ff]" />
          Octos.
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="hud-button rounded-sm p-2"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div
            className="hud-grid-bg absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-[#00d4ff]/20 px-5 py-5"
            style={{
              paddingTop: "max(1.25rem, env(safe-area-inset-top))",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="hud-button mb-4 ml-auto rounded-sm p-2"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              userEmail={userEmail}
              googleCalendarConnected={googleCalendarConnected}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <aside
        className="hidden shrink-0 flex-col border-r border-[#00d4ff]/15 px-5 py-6 md:flex md:w-60"
        style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        <SidebarContent userEmail={userEmail} googleCalendarConnected={googleCalendarConnected} pathname={pathname} />
      </aside>
    </>
  );
}

function SidebarContent({
  userEmail,
  googleCalendarConnected,
  pathname,
  onNavigate,
}: AppSidebarProps & { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <Link
        to="/app"
        onClick={onNavigate}
        className="font-fustat hidden items-center gap-2 text-lg font-extrabold tracking-tight text-zinc-50 md:flex"
      >
        <Bot className="h-5 w-5 text-[#00d4ff] drop-shadow-[0_0_6px_rgba(0,212,255,0.5)]" />
        Octos.
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={
                active
                  ? "rounded-sm border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-2 font-mono text-xs font-semibold tracking-widest text-[#00d4ff] uppercase"
                  : "rounded-sm px-3 py-2 font-mono text-xs font-semibold tracking-widest text-zinc-400 uppercase transition-colors hover:text-zinc-50"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-3 border-t border-[#00d4ff]/15 pt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="arc-reactor" />
          <span className="font-mono tracking-widest text-[#00d4ff]/80">ONLINE</span>
          <HudClock />
        </div>
        {userEmail && <ConnectGoogleCalendarButton connected={Boolean(googleCalendarConnected)} />}
        {userEmail && (
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="truncate">{userEmail}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </div>
  );
}
