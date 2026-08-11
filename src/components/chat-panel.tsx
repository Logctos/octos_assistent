import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ChatMessage } from "@/types";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import { useHandGesture } from "@/lib/hooks/use-hand-gesture";
import { JarvisOrbAvatar } from "@/components/jarvis-orb-avatar";
import { JarvisFrame } from "@/components/jarvis-frame";
import { DateTile, WeatherTile, NewsTile, ActivitiesTile, AgentsTile } from "@/components/hud-tiles";
import type { NewsItem } from "@/lib/tech-news";
import { runChat } from "@/features/chat/run-chat";
import { loadChatHistory, saveChatMessage } from "@/features/chat/api";
import { NextStudyCard } from "@/features/estudos/next-study-card";

const API_KEY_STORAGE_KEY = "octos:openai-api-key";
const VOICE_ENABLED_STORAGE_KEY = "octos:voice-enabled";
const HANDS_FREE_STORAGE_KEY = "octos:hands-free";
const GESTURE_STORAGE_KEY = "octos:gesture-enabled";
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
  const [gestureEnabled, setGestureEnabled] = useState(
    () => localStorage.getItem(GESTURE_STORAGE_KEY) === "true"
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    isSupported: isSpeechOutputSupported,
    isSpeaking,
    lastError: lastSpeechError,
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
  const {
    isSupported: isGestureSupported,
    isReady: isGestureReady,
    error: gestureError,
  } = useHandGesture({
    enabled: gestureEnabled,
    onGrab: () => {
      if (!isLoading && !isListening && isSpeechInputSupported) startListening();
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

  function handleGestureToggle() {
    const next = !gestureEnabled;
    setGestureEnabled(next);
    localStorage.setItem(GESTURE_STORAGE_KEY, String(next));
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
        },
        navigate
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
            <span className="text-xs text-zinc-400">
              {apiKey ? "Chave da OpenAI configurada" : "Chave da OpenAI não configurada"} ·{" "}
              {messages.length} mensagens
              {lastSpeechError && (
                <span className="text-red-400"> · erro de voz: {lastSpeechError}</span>
              )}
              {gestureError && <span className="text-red-400"> · erro de gesto: {gestureError}</span>}
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
            {isSpeechOutputSupported && (
              <button
                type="button"
                onClick={() => speak("Teste de voz, um dois três.")}
                className="hud-button rounded-sm px-2 py-1 text-xs"
              >
                Testar voz
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
                    ? "rounded-sm border border-[#00d4ff]/40 bg-[#00d4ff]/10 px-2 py-1 text-xs text-[#7fe9ff]"
                    : "hud-button rounded-sm px-2 py-1 text-xs"
                }
              >
                {handsFreeEnabled ? "🤝 Mãos-livres" : "🤝"}
              </button>
            )}
            {isSpeechInputSupported && isGestureSupported && (
              <button
                type="button"
                onClick={handleGestureToggle}
                aria-label={gestureEnabled ? "Desativar gatilho por gesto" : "Ativar gatilho por gesto"}
                title="Abra e feche a mão na frente da câmera para começar a falar"
                className={
                  gestureEnabled
                    ? "rounded-sm border border-[#00d4ff]/40 bg-[#00d4ff]/10 px-2 py-1 text-xs text-[#7fe9ff]"
                    : "hud-button rounded-sm px-2 py-1 text-xs"
                }
              >
                {gestureEnabled ? `✋ Gesto${isGestureReady ? "" : "…"}` : "✋"}
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
            <label htmlFor="openai-api-key" className="text-xs text-zinc-400">
              Chave da API da OpenAI (salva apenas neste navegador)
            </label>
            <input
              id="openai-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="sk-..."
              className="hud-input rounded-sm px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 sm:text-sm"
            />
          </div>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_260px]">
        <div className="order-1 flex flex-col gap-4 lg:order-1 lg:justify-center">
          <DateTile dateLabel={dateLabel} />
          <WeatherTile />
          <NewsTile news={news} />
        </div>

        <div className="order-3 flex flex-col items-center justify-center gap-3 py-6 lg:order-2">
          <span className="arc-reactor" />
          <JarvisFrame>
            <JarvisOrbAvatar status={avatarStatus} />
          </JarvisFrame>
          <span className="hud-eyebrow">{statusLabel}</span>
        </div>

        <div className="order-2 flex flex-col gap-4 lg:order-3 lg:justify-center">
          <AgentsTile agents={agents} />
          <ActivitiesTile activities={activities} />
          <NextStudyCard />
        </div>
      </div>

      <div className="hud-panel hud-scanline flex w-full flex-col gap-3 rounded-sm p-4">
        <div className="hud-panel flex h-72 flex-col gap-3 overflow-y-auto rounded-sm p-4">
          {messages.length === 0 && (
            <p className="m-auto text-center text-sm text-zinc-400">
              Envie uma mensagem para começar.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-sm px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto border border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#8be9ff]"
                  : "mr-auto border border-white/10 bg-white/5 text-zinc-200"
              }`}
            >
              {message.content || (message.role === "assistant" && isLoading ? "…" : "")}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {isSpeechInputSupported && (
            <button
              type="button"
              onClick={() => (isListening ? stopListening() : startListening())}
              aria-label={isListening ? "Parar de ouvir" : "Falar"}
              className={
                isListening
                  ? "animate-pulse rounded-sm border border-[#00d4ff]/40 bg-[#00d4ff]/10 px-3 py-2 text-sm text-[#7fe9ff]"
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
            className="hud-input min-w-0 flex-1 rounded-sm px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 disabled:cursor-not-allowed sm:text-sm"
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
