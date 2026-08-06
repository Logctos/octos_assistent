"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou senha inválidos");
      setIsLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-white px-6 py-24 font-inter">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="font-fustat flex items-center gap-2 text-3xl font-extrabold tracking-tight text-black">
          <Bot className="h-8 w-8 text-[#0084FF]" />
          Octos.
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="hud-panel flex w-full max-w-sm flex-col gap-3 rounded-sm p-6"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs text-zinc-500">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs text-zinc-500">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="hud-button mt-2 rounded-sm px-4 py-2 text-sm"
        >
          {isLoading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
