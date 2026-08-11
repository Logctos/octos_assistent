import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou senha inválidos");
      setIsLoading(false);
      return;
    }

    navigate("/app");
  }

  return (
    <div className="hud-grid-bg flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 font-inter">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="font-fustat flex items-center gap-2 text-3xl font-extrabold tracking-tight text-zinc-50">
          <Bot className="h-8 w-8 text-[#00d4ff]" />
          Octos.
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="hud-panel flex w-full max-w-sm flex-col gap-3 rounded-sm p-6"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs text-zinc-400">
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
            className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs text-zinc-400">
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
            className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 disabled:cursor-not-allowed sm:text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

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
