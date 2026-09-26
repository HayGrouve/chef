"use client";

// PROTOTYPE — Cook Mode 2.0 timers: several named timers at once, stored as
// absolute end times so they stay accurate after the tab was hidden.
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Pause, Play, Plus, Timer as TimerIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/prototype/recipe-text";
import { cn } from "@/lib/utils";

export type CookTimer = {
  id: string;
  /** Stable key of the step phrase that started it, e.g. "s4-t1"; manual timers have none. */
  sourceKey?: string;
  label: string;
  totalSeconds: number;
  status: "running" | "paused" | "done";
  /** Epoch ms when a running timer ends. */
  endsAt: number;
  /** Remaining ms while paused. */
  remainingMs: number;
};

export function remainingSeconds(timer: CookTimer, now: number): number {
  if (timer.status === "done") return 0;
  const ms = timer.status === "paused" ? timer.remainingMs : timer.endsAt - now;
  return Math.max(0, Math.ceil(ms / 1000));
}

// --- Alarm: beeps, vibration, system notification ---------------------------

let audioContext: AudioContext | null = null;

/** Must be called from a user gesture once so browsers allow sound later. */
function unlockAudio() {
  if (typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  audioContext ??= new Ctor();
  if (audioContext.state === "suspended") void audioContext.resume();
}

function beep() {
  if (!audioContext) unlockAudio();
  const ctx = audioContext;
  if (!ctx) return;
  const start = ctx.currentTime + 0.05;
  // Two groups of three short beeps
  for (let i = 0; i < 6; i++) {
    const t = start + i * 0.22 + (i >= 3 ? 0.4 : 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

function requestNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    void Notification.requestPermission().catch(() => undefined);
  }
}

async function notify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    // Android Chrome only allows notifications through a service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, { body, tag: title });
      return;
    }
    new Notification(title, { body, tag: title });
  } catch {
    // Notifications are a bonus; the tray and beep still fire.
  }
}

function alarm(timer: CookTimer, context: string) {
  beep();
  navigator.vibrate?.([300, 150, 300, 150, 300]);
  void notify(`${timer.label} is done`, context);
}

// --- State hook -------------------------------------------------------------

export function useCookTimers(initial: CookTimer[], notificationContext: string) {
  const [timers, setTimers] = useState<CookTimer[]>(initial);
  const [now, setNow] = useState(() => Date.now());
  const timersRef = useRef(timers);
  const contextRef = useRef(notificationContext);

  useEffect(() => {
    timersRef.current = timers;
    contextRef.current = notificationContext;
  }, [timers, notificationContext]);

  const hasRunning = timers.some((t) => t.status === "running");

  useEffect(() => {
    if (!hasRunning) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const finished = timersRef.current.filter((x) => x.status === "running" && x.endsAt <= t);
      if (finished.length === 0) return;
      const ids = new Set(finished.map((x) => x.id));
      setTimers((prev) =>
        prev.map((x) => (ids.has(x.id) ? { ...x, status: "done", remainingMs: 0 } : x))
      );
      finished.forEach((x) => alarm(x, contextRef.current));
    };
    tick();
    const interval = window.setInterval(tick, 500);
    // Background tabs throttle intervals; catch up as soon as we're visible.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [hasRunning]);

  const start = useCallback((label: string, seconds: number, sourceKey?: string) => {
    unlockAudio();
    requestNotificationPermission();
    const t = Date.now();
    setNow(t);
    setTimers((prev) => {
      const fresh: CookTimer = {
        id: `${t}-${Math.random().toString(36).slice(2, 7)}`,
        sourceKey,
        label,
        totalSeconds: seconds,
        status: "running",
        endsAt: t + seconds * 1000,
        remainingMs: seconds * 1000,
      };
      // Restarting a step's timer replaces the old one.
      const rest = sourceKey ? prev.filter((x) => x.sourceKey !== sourceKey) : prev;
      return [...rest, fresh];
    });
  }, []);

  const pause = useCallback((id: string) => {
    const t = Date.now();
    setTimers((prev) =>
      prev.map((x) =>
        x.id === id && x.status === "running"
          ? { ...x, status: "paused", remainingMs: Math.max(0, x.endsAt - t) }
          : x
      )
    );
  }, []);

  const resume = useCallback((id: string) => {
    unlockAudio();
    const t = Date.now();
    setNow(t);
    setTimers((prev) =>
      prev.map((x) =>
        x.id === id && x.status === "paused"
          ? { ...x, status: "running", endsAt: t + x.remainingMs }
          : x
      )
    );
  }, []);

  const addMinute = useCallback((id: string) => {
    unlockAudio();
    const t = Date.now();
    setNow(t);
    setTimers((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        if (x.status === "done") return { ...x, status: "running", endsAt: t + 60_000, remainingMs: 60_000 };
        if (x.status === "paused") return { ...x, remainingMs: x.remainingMs + 60_000 };
        return { ...x, endsAt: x.endsAt + 60_000 };
      })
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setTimers((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { timers, now, start, pause, resume, addMinute, dismiss };
}

export type CookTimersApi = ReturnType<typeof useCookTimers>;

// --- Tray -------------------------------------------------------------------

function TimerCard({ timer, api }: { timer: CookTimer; api: CookTimersApi }) {
  const left = remainingSeconds(timer, api.now);
  const done = timer.status === "done";
  const paused = timer.status === "paused";
  return (
    <div
      role="status"
      aria-live={done ? "assertive" : "off"}
      className={cn(
        "flex min-w-[15rem] flex-1 items-center gap-2 rounded-lg border bg-card py-1.5 pl-3 pr-1 shadow-sm",
        done && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/30 animate-pulse"
      )}
    >
      {done ? <BellRing className="h-4 w-4 shrink-0" /> : <TimerIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-xs", done ? "text-primary-foreground/90" : "text-muted-foreground")}>
          {timer.label}
        </p>
        <p className={cn("font-mono text-lg font-semibold leading-tight tabular-nums", paused && "opacity-60")}>
          {done ? "Done!" : formatDuration(left)}
        </p>
      </div>
      {!done &&
        (paused ? (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => api.resume(timer.id)} aria-label={`Resume ${timer.label}`}>
            <Play className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => api.pause(timer.id)} aria-label={`Pause ${timer.label}`}>
            <Pause className="h-4 w-4 fill-current" />
          </Button>
        ))}
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-9 px-2 text-xs", done && "hover:bg-primary-foreground/15 hover:text-primary-foreground")}
        onClick={() => api.addMinute(timer.id)}
        aria-label={`Add one minute to ${timer.label}`}
      >
        <Plus className="h-3 w-3" />1m
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-9 w-9", done && "hover:bg-primary-foreground/15 hover:text-primary-foreground")}
        onClick={() => api.dismiss(timer.id)}
        aria-label={`Dismiss ${timer.label}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Mobile: a scrollable row under the header. Desktop: a floating stack bottom-right. */
export function TimerTray({ api, className }: { api: CookTimersApi; className?: string }) {
  if (api.timers.length === 0) return null;
  return (
    <div data-no-swipe className={className}>
      {api.timers.map((t) => (
        <TimerCard key={t.id} timer={t} api={api} />
      ))}
    </div>
  );
}
