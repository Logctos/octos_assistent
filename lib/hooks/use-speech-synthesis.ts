"use client";

import { useEffect, useState } from "react";

export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // `window` doesn't exist during SSR, so support must be detected client-only
    // (after mount) to avoid a hydration mismatch on the very first client render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported("speechSynthesis" in window);
  }, []);

  function speak(text: string, lang = "pt-BR") {
    if (!isSupported || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function cancel() {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  return { isSupported, isSpeaking, speak, cancel };
}
