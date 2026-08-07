import { useRef, useState } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
}

export function useSpeechRecognition({ lang = "pt-BR", onResult }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function start() {
    if (!isSupported || isListening) return;

    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      onResult(result[0].transcript, result.isFinal);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { isSupported, isListening, start, stop };
}
