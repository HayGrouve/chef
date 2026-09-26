"use client";

// PROTOTYPE — hands-free control for Cook Mode 2.0 via the Web Speech API.
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

/** Maps a heard phrase to a command. Order matters: "stop listening" wins. */
export function parseCommand(phrase: string): VoiceCommand | null {
  const p = ` ${phrase.toLowerCase().replace(/[^\p{L}\s]/gu, " ")} `;
  const has = (...words: string[]) => words.some((w) => p.includes(` ${w} `));
  if (has("stop listening", "stop voice")) return "stop";
  if (has("timer", "start timer")) return "timer";
  if (has("ingredients", "ingredient")) return "ingredients";
  if (has("next", "forward", "continue")) return "next";
  if (has("back", "previous", "go back")) return "back";
  if (has("repeat", "read", "again", "say again")) return "repeat";
  return null;
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
    recognition.lang = navigator.language || "en-US";

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
        fatalRef.current("Microphone access was blocked");
      } else if (event.error === "audio-capture") {
        active = false;
        fatalRef.current("No microphone found");
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
      fatalRef.current("Couldn't start voice control");
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

export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}
