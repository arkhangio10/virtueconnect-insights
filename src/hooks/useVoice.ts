/**
 * useVoice — unified hook for:
 *   1. Text-to-Speech via ElevenLabs (backend proxy)
 *   2. Speech-to-Text via Web Speech API (browser-native, free)
 */

import { useState, useCallback, useRef, useEffect } from "react";

const SONIA_API_BASE =
  (import.meta.env.VITE_SONIA_API_URL as string | undefined)?.trim() ?? "";

// ── Types ───────────────────────────────────────────────────────────────────
interface UseVoiceReturn {
  /** TTS */
  speaking: boolean;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  ttsAvailable: boolean;

  /** STT */
  listening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  sttAvailable: boolean;

  /** Auto-speak toggle */
  autoSpeak: boolean;
  setAutoSpeak: (v: boolean) => void;
}

// Strip markdown for cleaner TTS output
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")          // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1")   // bold
    .replace(/\*([^*]+)\*/g, "$1")       // italic
    .replace(/__([^_]+)__/g, "$1")       // bold alt
    .replace(/_([^_]+)_/g, "$1")         // italic alt
    .replace(/`([^`]+)`/g, "$1")         // inline code
    .replace(/```[\s\S]*?```/g, "")      // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^\s*[-*+]\s+/gm, "")       // list items
    .replace(/^\s*\d+\.\s+/gm, "")       // numbered list
    .replace(/\n{2,}/g, ". ")            // double newlines → pause
    .replace(/\n/g, " ")                 // single newlines
    .replace(/\s{2,}/g, " ")             // extra spaces
    .trim();
}

// ── SpeechRecognition types ─────────────────────────────────────────────────
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useVoice(): UseVoiceReturn {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Check availability
  const sttAvailable = typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const ttsAvailable = true; // Always true — falls back to browser TTS if ElevenLabs fails

  // ── TTS: speak text via ElevenLabs ──────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    const cleanText = stripMarkdown(text);
    if (!cleanText) return;

    setSpeaking(true);

    try {
      // Try ElevenLabs via backend proxy
      const res = await fetch(`${SONIA_API_BASE}/api/sonia/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!res.ok) throw new Error(`TTS ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        audioRef.current = null;
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setSpeaking(false);
        audioRef.current = null;
        // Fallback to browser TTS
        fallbackBrowserTTS(cleanText);
      };

      await audio.play();
    } catch {
      // Fallback to browser speech synthesis
      fallbackBrowserTTS(cleanText);
    }
  }, []);

  const fallbackBrowserTTS = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  // ── STT: listen via Web Speech API ──────────────────────────────────────
  const startListening = useCallback(() => {
    if (!sttAvailable) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    // Stop any current recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result[0]) {
          // Check if this result is final
          const isFinal = (result as any).isFinal ?? false;
          if (isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
      }
      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
      setListening(false);
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setListening(true);
    recognition.start();
  }, [sttAvailable]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  return {
    speaking,
    speak,
    stopSpeaking,
    ttsAvailable,
    listening,
    transcript,
    startListening,
    stopListening,
    sttAvailable,
    autoSpeak,
    setAutoSpeak,
  };
}
