import { useEffect, useRef, useState } from "react";

export function useSpeechSynthesis() {
  const [isSupported] = useState(() => "speechSynthesis" in window);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!isSupported) return;

    // Mobile browsers (iOS Safari, most Android browsers) only let speechSynthesis play
    // if a call happens synchronously inside a user gesture. Our real speak() call fires
    // after an async fetch/stream finishes, so the original tap is long gone by then and
    // audio gets silently blocked. Priming with a silent utterance on the very first tap
    // unlocks the API for the rest of the session.
    function unlock() {
      const primer = new SpeechSynthesisUtterance(" ");
      primer.volume = 0;
      window.speechSynthesis.speak(primer);
    }

    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [isSupported]);

  function speak(text: string, lang = "pt-BR") {
    if (!isSupported || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    // Some Chrome/Android builds garbage-collect the utterance mid-speech if nothing
    // outside this function keeps a reference to it, cutting audio off randomly.
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function cancel() {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  return { isSupported, isSpeaking, speak, cancel };
}
