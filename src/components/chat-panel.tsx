import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import { OctosAvatar } from "@/components/octos-avatar";
import { JarvisFrame } from "@/components/jarvis-frame";
import { DateTile, WeatherTile, NewsTile, ActivitiesTile, AgentsTile } from "@/components/hud-tiles";
import type { NewsItem } from "@/lib/tech-news";
import { runChat } from "@/features/chat/run-chat";
import { loadChatHistory, saveChatMessage } from "@/features/chat/api";

const API_KEY_STORAGE_KEY = "octos:openai-api-key";
const VOICE_ENABLED_STORAGE_KEY = "octos:voice-enabled";
const HANDS_FREE_STORAGE_KEY = "octos:hands-free";
const MODEL_HISTORY_LIMIT = 20;

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
  news,
}: {
  dateLabel: string;
  activities: Activity[];
  agents: AgentStatus[];
  news: NewsItem[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) ?? "");
  const [showSettings, setShowSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(
    () => localStorage.getItem(VOICE_ENABLED_STORAGE_KEY) !== "false"
  );
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(
    () => localStorage.getItem(HANDS_FREE_STORAGE_KEY) === "true"
  );
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

  useEffect(() => {
    loadChatHistory().then((history) => {
      if (history.length > 0) setMessages(history);
    });
  }, []);

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

  function handleHandsFreeToggle() {
    const next = !handsFreeEnabled;
    setHandsFreeEnabled(next);
    localStorage.setItem(HANDS_FREE_STORAGE_KEY, String(next));
    if (!next) stopListening();
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
    saveChatMessage("user", trimmed);

    try {
      let assistantContent = "";

      await runChat(
        history.slice(-MODEL_HISTORY_LIMIT).map(({ role, content }) => ({ role, content })),
        apiKey,
        (chunk) => {
          assistantContent += chunk;
          setMessages((current) =>
            current.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: assistantContent } : m
            )
          );
        }
      );

      saveChatMessage("assistant", assistantContent);
      if (voiceEnabled) {
        speak(assistantContent, "pt-BR", handsFreeEnabled ? startListening : undefined);
      }
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
      <div className="hud-panel flex w-full flex-col gap-3 rounded-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="hud-eyebrow">Console</span>
            <span className="text-xs text-zinc-500">
              {apiKey ? "Chave da OpenAI configurada" : "Chave da OpenAI não configurada"} ·{" "}
              {messages.length} mensagens
            </span>
          </div>
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
            {isSpeechOutputSupported && isSpeechInputSupported && (
              <button
                type="button"
                onClick={handleHandsFreeToggle}
                aria-label={handsFreeEnabled ? "Desativar modo mãos-livres" : "Ativar modo mãos-livres"}
                title="Modo mãos-livres: volta a ouvir sozinho depois de cada resposta"
                className={
                  handsFreeEnabled
                    ? "rounded-sm border border-[#0084FF]/40 bg-[#0084FF]/10 px-2 py-1 text-xs text-[#0066cc]"
                    : "hud-button rounded-sm px-2 py-1 text-xs"
                }
              >
                {handsFreeEnabled ? "🤝 Mãos-livres" : "🤝"}
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
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_260px]">
        <div className="flex flex-col gap-4 lg:justify-center">
          <DateTile dateLabel={dateLabel} />
          <WeatherTile />
          <NewsTile news={news} />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <span className="arc-reactor" />
          <JarvisFrame>
            <OctosAvatar />
          </JarvisFrame>
          <span className="hud-eyebrow">{statusLabel}</span>
        </div>

        <div className="flex flex-col gap-4 lg:justify-center">
          <ActivitiesTile activities={activities} />
          <AgentsTile agents={agents} />
        </div>
      </div>

      <div className="hud-panel hud-scanline flex w-full flex-col gap-3 rounded-sm p-4">
        <div className="hud-panel flex h-72 flex-col gap-3 overflow-y-auto rounded-sm p-4">
          {messages.length === 0 && (
            <p className="m-auto text-center text-sm text-zinc-500">
              Envie uma mensagem para começar.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-sm px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto border border-[#0084FF]/20 bg-[#0084FF]/8 text-[#0066cc]"
                  : "mr-auto border border-black/5 bg-zinc-50 text-zinc-800"
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
