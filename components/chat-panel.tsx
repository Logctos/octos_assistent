"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import { OctosAvatar } from "@/components/octos-avatar";
import { JarvisFrame } from "@/components/jarvis-frame";
import { DateTile, WeatherTile, ActivitiesTile, AgentsTile } from "@/components/hud-tiles";

const API_KEY_STORAGE_KEY = "octos:openai-api-key";
const VOICE_ENABLED_STORAGE_KEY = "octos:voice-enabled";

interface Activity {
  label: string;
  time?: string;
}

interface AgentStatus {
  label: string;
  connected: boolean;
}

export function ChatPanel({
  dateLabel,
  activities,
  agents,
}: {
  dateLabel: string;
  activities: Activity[];
  agents: AgentStatus[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    isSupported: isSpeechOutputSupported,
    isSpeaking,
    speak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis();
  const { isSupported: isSpeechInputSupported, isListening, start: startListening, stop: stopListening } =
    useSpeechRecognition({
      onResult: (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal) sendMessage(transcript);
      },
    });

  const lastMessage = messages[messages.length - 1];
  const isStreamingResponse =
    isLoading && lastMessage?.role === "assistant" && lastMessage.content.length > 0;

  const avatarStatus =
    isSpeaking || isStreamingResponse
      ? "speaking"
      : isLoading
        ? "thinking"
        : isListening
          ? "listening"
          : "idle";

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this can't be a lazy useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(localStorage.getItem(API_KEY_STORAGE_KEY) ?? "");
    setVoiceEnabled(localStorage.getItem(VOICE_ENABLED_STORAGE_KEY) !== "false");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    if (value) {
      localStorage.setItem(API_KEY_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }

  function handleVoiceToggle() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, String(next));
    if (!next) cancelSpeech();
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    cancelSpeech();
    setError(null);
    setInput("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    const history = [...messages, userMessage];
    setMessages([...history, assistantMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-openai-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Falha ao falar com o assistente");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((m) =>
            m.id === assistantMessage.id ? { ...m, content: assistantContent } : m
          )
        );
      }

      if (voiceEnabled) speak(assistantContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao falar com o assistente");
      setMessages((current) => current.filter((m) => m.id !== assistantMessage.id));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const statusLabel =
    avatarStatus === "thinking"
      ? "Pensando…"
      : avatarStatus === "listening"
        ? "Ouvindo…"
        : avatarStatus === "speaking"
          ? "Falando…"
          : "Em espera";

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_260px]">
        <div className="flex flex-col gap-4 lg:justify-center">
          <DateTile dateLabel={dateLabel} />
          <WeatherTile />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <span className="arc-reactor" />
          <JarvisFrame>
            <OctosAvatar size={220} />
          </JarvisFrame>
          <h1 className="font-fustat text-3xl font-extrabold tracking-tight text-black">Octos.</h1>
          <span className="font-mono text-xs tracking-widest text-[#0084FF]/70">
            {statusLabel.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-col gap-4 lg:justify-center">
          <ActivitiesTile activities={activities} />
          <AgentsTile agents={agents} />
        </div>
      </div>

      <div className="hud-panel flex w-full flex-col gap-3 rounded-sm p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {apiKey ? "Chave da OpenAI configurada" : "Chave da OpenAI não configurada"} ·{" "}
            {messages.length} mensagens
          </span>
          <div className="flex items-center gap-2">
            {isSpeechOutputSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                aria-label={voiceEnabled ? "Desativar voz" : "Ativar voz"}
                className="hud-button rounded-sm px-2 py-1 text-xs"
              >
                {voiceEnabled ? "🔊" : "🔇"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Configurações"
              className="hud-button rounded-sm px-2 py-1 text-xs"
            >
              ⚙︎
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="hud-panel flex flex-col gap-2 rounded-sm p-3">
            <label htmlFor="openai-api-key" className="text-xs text-zinc-500">
              Chave da API da OpenAI (salva apenas neste navegador)
            </label>
            <input
              id="openai-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="sk-..."
              className="hud-input rounded-sm px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        )}

        <div className="hud-panel flex h-72 flex-col gap-3 overflow-y-auto rounded-sm p-4">
          {messages.length === 0 && (
            <p className="m-auto text-center text-sm text-zinc-500">
              Envie uma mensagem para começar.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto border border-[#0084FF]/20 bg-[#0084FF]/8 text-[#0066cc]"
                  : "mr-auto bg-zinc-100 text-zinc-800"
              }`}
            >
              {message.content || (message.role === "assistant" && isLoading ? "…" : "")}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {isSpeechInputSupported && (
            <button
              type="button"
              onClick={() => (isListening ? stopListening() : startListening())}
              aria-label={isListening ? "Parar de ouvir" : "Falar"}
              className={
                isListening
                  ? "animate-pulse rounded-sm border border-[#0084FF]/40 bg-[#0084FF]/10 px-3 py-2 text-sm text-[#0066cc]"
                  : "hud-button rounded-sm px-3 py-2 text-sm"
              }
            >
              🎙️
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isListening ? "Ouvindo…" : "Fale com o Octos…"}
            className="hud-input flex-1 rounded-sm px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="hud-button rounded-sm px-4 py-2 text-sm"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
