"use client";

// Hands-free control for cook mode via the Web Speech API.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Minimal typing of the parts of the (non-standard) Web Speech API we use.
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: RecognitionResult };
}
interface RecognitionErrorEvent {
  readonly error: string;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceCommand = "next" | "back" | "repeat" | "timer" | "ingredients" | "stop";

/**
 * Maps a heard phrase to a command, in Bulgarian or English. Order matters:
 * "спри да слушаш" wins.
 */
export function parseCommand(phrase: string): VoiceCommand | null {
  const p = ` ${phrase.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ")} `;
  const has = (...words: string[]) => words.some((w) => p.includes(` ${w} `));
  if (has("спри да слушаш", "спри слушането", "спри гласа", "stop listening", "stop voice")) return "stop";
  if (has("таймер", "таймера", "засечи", "timer", "start timer")) return "timer";
  if (has("съставки", "съставките", "продукти", "продуктите", "ingredients", "ingredient")) return "ingredients";
  if (has("напред", "следваща", "следващата", "следващ", "нататък", "продължи", "next", "forward", "continue")) return "next";
  if (has("назад", "предишна", "предишната", "върни", "back", "previous", "go back")) return "back";
  if (has("повтори", "прочети", "отново", "пак", "repeat", "read", "again", "say again")) return "repeat";
  return null;
}

/**
 * The language to listen in: Bulgarian when the browser lists it at all (the
 * UI is Bulgarian), otherwise the browser's own language. English commands
 * work either way.
 */
export function recognitionLang(languages: readonly string[], fallback: string) {
  return languages.some((l) => l.toLowerCase().startsWith("bg")) ? "bg-BG" : fallback || "bg-BG";
}

const noopSubscribe = () => () => undefined;

export function useVoiceSupported() {
  return useSyncExternalStore(
    noopSubscribe,
    () => getRecognitionCtor() !== null,
    () => false
  );
}

/**
 * Listens continuously while `enabled`, restarting when the browser ends the
 * session (it does so after silence). Ignores what it hears while the page
 * itself is speaking so reading a step aloud can't trigger commands.
 */
export function useVoiceCommands(
  enabled: boolean,
  onCommand: (command: VoiceCommand) => void,
  onFatal: (message: string) => void
) {
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const commandRef = useRef(onCommand);
  const fatalRef = useRef(onFatal);

  useEffect(() => {
    commandRef.current = onCommand;
    fatalRef.current = onFatal;
  }, [onCommand, onFatal]);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!enabled || !Ctor) return;
    let active = true;
    let restartTimer: number | undefined;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = recognitionLang(navigator.languages ?? [], navigator.language);

    recognition.onresult = (event) => {
      if (window.speechSynthesis?.speaking) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const phrase = result[0]?.transcript.trim() ?? "";
        if (!phrase) continue;
        setLastHeard(phrase);
        const command = parseCommand(phrase);
        if (command) commandRef.current(command);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        active = false;
        fatalRef.current("Достъпът до микрофона е спрян");
      } else if (event.error === "audio-capture") {
        active = false;
        fatalRef.current("Няма микрофон");
      }
      // "no-speech" / "network" / "aborted": onend restarts
    };
    recognition.onend = () => {
      if (!active) return;
      restartTimer = window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // already started
        }
      }, 300);
    };

    try {
      recognition.start();
    } catch {
      fatalRef.current("Гласовото управление не тръгна");
    }

    return () => {
      active = false;
      window.clearTimeout(restartTimer);
      recognition.onend = null;
      recognition.abort();
    };
  }, [enabled]);

  return { lastHeard: enabled ? lastHeard : null };
}

/**
 * Reads the parts aloud one after another, each in its own language: the app
 * speaks Bulgarian, a recipe keeps its own (Cyrillic reads as Bulgarian, the
 * rest as English).
 */
export function speak(...parts: string[]) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  for (const text of parts.filter(Boolean)) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /\p{Script=Cyrillic}/u.test(text) ? "bg-BG" : "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}
