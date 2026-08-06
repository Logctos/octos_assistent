"use client";

import { useEffect, useState } from "react";

const WEATHER_INFO: Record<number, { label: string; icon: string }> = {
  0: { label: "Céu limpo", icon: "☀️" },
  1: { label: "Poucas nuvens", icon: "🌤️" },
  2: { label: "Parcialmente nublado", icon: "⛅" },
  3: { label: "Nublado", icon: "☁️" },
  45: { label: "Neblina", icon: "🌫️" },
  48: { label: "Neblina", icon: "🌫️" },
  51: { label: "Garoa fraca", icon: "🌦️" },
  53: { label: "Garoa", icon: "🌦️" },
  55: { label: "Garoa forte", icon: "🌦️" },
  61: { label: "Chuva fraca", icon: "🌧️" },
  63: { label: "Chuva", icon: "🌧️" },
  65: { label: "Chuva forte", icon: "🌧️" },
  71: { label: "Neve fraca", icon: "🌨️" },
  73: { label: "Neve", icon: "🌨️" },
  75: { label: "Neve forte", icon: "🌨️" },
  80: { label: "Pancadas de chuva", icon: "🌧️" },
  81: { label: "Pancadas de chuva", icon: "🌧️" },
  82: { label: "Pancadas fortes", icon: "⛈️" },
  95: { label: "Tempestade", icon: "⛈️" },
  96: { label: "Tempestade com granizo", icon: "⛈️" },
  99: { label: "Tempestade com granizo", icon: "⛈️" },
};

type State =
  | { status: "loading" }
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "error"; message: string }
  | { status: "ready"; temperature: number; code: number };

export function WeatherWidget() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      // Synchronous capability check on mount, not a derived-state cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "unsupported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            current_weather: "true",
          });
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
          if (!response.ok) throw new Error("Falha ao buscar o clima");

          const data = await response.json();
          setState({
            status: "ready",
            temperature: Math.round(data.current_weather.temperature),
            code: data.current_weather.weathercode,
          });
        } catch (error) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Falha ao buscar o clima",
          });
        }
      },
      () => setState({ status: "denied" }),
      { timeout: 10000 }
    );
  }, []);

  if (state.status === "loading") {
    return <p className="text-sm text-zinc-600">Localizando…</p>;
  }

  if (state.status === "unsupported") {
    return <p className="text-sm text-zinc-600">Geolocalização não suportada</p>;
  }

  if (state.status === "denied") {
    return <p className="text-sm text-zinc-600">Permissão de localização negada</p>;
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-400">{state.message}</p>;
  }

  const info = WEATHER_INFO[state.code] ?? { label: "—", icon: "🌡️" };

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl leading-none">{info.icon}</span>
      <div>
        <p className="text-lg text-zinc-200">{state.temperature}°C</p>
        <p className="text-xs text-zinc-500">{info.label}</p>
      </div>
    </div>
  );
}
