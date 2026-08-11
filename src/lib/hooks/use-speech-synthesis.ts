import { useEffect, useRef, useState } from "react";

/** Best pt-BR voice available, preferring non-"novelty" local voices. iOS Safari often stays
 *  silent (no error, no audio) when an utterance has no explicit `voice` and relies only on
 *  `lang`, especially before the async `voiceschanged` event has ever fired. */
function pickPortugueseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const ptVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (ptVoices.length === 0) return null;

  return (
    ptVoices.find((v) => v.lang.toLowerCase() === "pt-br") ??
    ptVoices.find((v) => v.localService) ??
    ptVoices[0]
  );
}

export function useSpeechSynthesis() {
  const [isSupported] = useState(() => "speechSynthesis" in window);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!isSupported) return;

    // Voices load asynchronously (especially on iOS) — grab them as soon as they're ready,
    // and also try immediately in case they're already cached from a previous page load.
    function loadVoice() {
      voiceRef.current = pickPortugueseVoice();
    }
    loadVoice();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoice);

    // Mobile browsers (iOS Safari, most Android browsers) only let speechSynthesis play
    // if a call happens synchronously inside a user gesture. Our real speak() call fires
    // after an async fetch/stream finishes, so the original tap is long gone by then and
    // audio gets silently blocked. Priming with a silent utterance on the very first tap
    // unlocks the API for the rest of the session. iOS can also leave the engine "paused"
    // after the app was backgrounded, so resume() runs on every tap, not just the first.
    function unlock() {
      window.speechSynthesis.resume();
      if (!sessionStorage.getItem("octos:speech-unlocked")) {
        const primer = new SpeechSynthesisUtterance(" ");
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
        sessionStorage.setItem("octos:speech-unlocked", "true");
      }
    }

    document.addEventListener("pointerdown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoice);
    };
  }, [isSupported]);

  function speak(text: string, lang = "pt-BR", onEnd?: () => void) {
    if (!isSupported || !text) return;

    setLastError(null);
    window.speechSynthesis.cancel();

    function doSpeak() {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      if (!voiceRef.current) voiceRef.current = pickPortugueseVoice();
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        setLastError(e.error || "erro desconhecido");
      };
      // Some Chrome/Android builds garbage-collect the utterance mid-speech if nothing
      // outside this function keeps a reference to it, cutting audio off randomly.
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    // iOS Safari can silently swallow speak() when it's called synchronously right after
    // cancel() — WebKit's internal speech queue hasn't actually cleared yet. A short delay
    // lets that settle first; harmless on browsers that don't need it.
    setTimeout(doSpeak, 150);
  }

  function cancel() {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  return { isSupported, isSpeaking, lastError, speak, cancel };
}
