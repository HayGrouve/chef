"use client";

// PROTOTYPE — Cook Mode 2.0: one step at a time, per-step scaled ingredients,
// tap-to-start named timers, scaling, voice control and a resilient wake lock.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Clock,
  ListChecks,
  ListOrdered,
  Loader2,
  Mic,
  MicOff,
  PartyPopper,
  Timer as TimerIcon,
  TimerReset,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatDuration,
  ingredientsForStep,
  scaleIngredient,
  segmentStep,
  type StepSegment,
} from "@/lib/prototype/recipe-text";
import { cn } from "@/lib/utils";
import { remainingSeconds, TimerTray, useCookTimers, type CookTimer } from "./timers";
import { speak, useVoiceCommands, useVoiceSupported, type VoiceCommand } from "./voice";

type Recipe = NonNullable<FunctionReturnType<typeof api.recipes.get>>;

const SCALES = [0.5, 1, 2, 3] as const;
const scaleLabel = (s: number) => (s === 0.5 ? "½×" : `${s}×`);

// --- Persistence (per recipe, per tab) --------------------------------------

type SavedSession = {
  step: number;
  scale: number;
  checked: number[];
  completed: number[];
  timers: CookTimer[];
};

const storageKey = (id: string) => `chef:proto-cook:${id}`;

function loadSession(recipe: Recipe): SavedSession {
  const fallback: SavedSession = { step: -1, scale: 1, checked: [], completed: [], timers: [] };
  try {
    const raw = sessionStorage.getItem(storageKey(recipe._id));
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<SavedSession>;
    const m = recipe.steps.length;
    return {
      step: typeof s.step === "number" ? Math.min(Math.max(s.step, -1), m) : -1,
      scale: SCALES.includes(s.scale as (typeof SCALES)[number]) ? (s.scale as number) : 1,
      checked: (s.checked ?? []).filter((i) => i < recipe.ingredients.length),
      completed: (s.completed ?? []).filter((i) => i < m),
      timers: Array.isArray(s.timers) ? s.timers : [],
    };
  } catch {
    return fallback;
  }
}

// --- Wake lock: re-acquired whenever the tab becomes visible again ----------

function useWakeLock() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;
    const request = async () => {
      if (document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      try {
        if (!("wakeLock" in navigator)) throw new Error("unsupported");
        const lock = await navigator.wakeLock.request("screen");
        if (disposed) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setFailed(false);
      } catch {
        if (!disposed) setFailed(true);
      }
    };
    void request();
    const onVisibility = () => void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);
  return failed;
}

// --- Small pieces -----------------------------------------------------------

function ScaleControl({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={String(value)}
      onValueChange={(v) => v && onChange(Number(v))}
      aria-label="Scale recipe"
      className={className}
    >
      {SCALES.map((s) => (
        <ToggleGroupItem
          key={s}
          value={String(s)}
          aria-label={`Scale ${scaleLabel(s)}`}
          className="px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {scaleLabel(s)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function IngredientChecklist({
  lines,
  indices,
  checked,
  onToggle,
  highlight,
  large,
}: {
  lines: string[];
  indices?: number[];
  checked: Set<number>;
  onToggle: (i: number) => void;
  highlight?: Set<number>;
  large?: boolean;
}) {
  const list = indices ?? lines.map((_, i) => i);
  return (
    <ul className={cn("grid gap-1.5", large && "sm:grid-cols-2 sm:gap-2")}>
      {list.map((i) => {
        const isChecked = checked.has(i);
        return (
          <li key={i}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/60",
                large ? "text-lg" : "text-sm",
                highlight?.has(i) && !isChecked && "border-primary/40 bg-primary/5",
                isChecked && "border-transparent bg-muted/40"
              )}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggle(i)}
                className={cn("mt-0.5", large && "mt-1 h-5 w-5")}
              />
              <span className={cn("leading-snug", isChecked && "text-muted-foreground line-through")}>
                {lines[i]}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function TimerChip({
  segment,
  timer,
  now,
  onTap,
}: {
  segment: Extract<StepSegment, { type: "timer" }>;
  timer?: CookTimer;
  now: number;
  onTap: () => void;
}) {
  const state = timer?.status ?? "idle";
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={
        state === "idle"
          ? `Start ${segment.label} timer, ${segment.text}`
          : `${segment.label} timer ${state}, ${formatDuration(remainingSeconds(timer!, now))} left`
      }
      className={cn(
        "mx-0.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-0 align-baseline font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        state === "idle" && "bg-primary/10 text-primary hover:bg-primary/20",
        state === "running" && "bg-primary text-primary-foreground",
        state === "paused" && "bg-primary/20 text-primary",
        state === "done" && "animate-pulse bg-primary text-primary-foreground"
      )}
    >
      <Clock className="h-[0.8em] w-[0.8em] shrink-0" />
      <span className="tabular-nums">
        {state === "idle" ? segment.text : state === "done" ? "Done" : formatDuration(remainingSeconds(timer!, now))}
      </span>
    </button>
  );
}

function ManualTimerButton({ onStart }: { onStart: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("5");
  const start = (m: number) => {
    if (!Number.isFinite(m) || m <= 0) return;
    onStart(m);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Add a timer">
              <TimerReset className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Add a timer</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(Number(minutes));
          }}
        >
          <p className="text-sm font-medium">New timer</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 3, 5, 10, 15, 30].map((m) => (
              <Button key={m} type="button" variant="outline" size="sm" onClick={() => start(m)}>
                {m}m
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              aria-label="Minutes"
            />
            <Button type="submit">Start</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function VoiceToggle({
  supported,
  on,
  onChange,
}: {
  supported: boolean;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  if (!supported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Toggle disabled aria-label="Voice control unavailable" className="h-9 w-9">
              <MicOff className="h-5 w-5" />
            </Toggle>
          </span>
        </TooltipTrigger>
        <TooltipContent>Voice needs Chrome or Edge</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          pressed={on}
          onPressedChange={onChange}
          aria-label="Hands-free voice control"
          className="h-9 w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Mic className="h-5 w-5" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        {on ? "Stop listening" : "Hands-free: say “next”, “back”, “repeat”, “timer”"}
      </TooltipContent>
    </Tooltip>
  );
}

function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// --- Session ----------------------------------------------------------------

function CookSession({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [initial] = useState(() => loadSession(recipe));
  const [step, setStep] = useState(initial.step);
  const [scale, setScale] = useState(initial.scale);
  const [checked, setChecked] = useState(() => new Set(initial.checked));
  const [completed, setCompleted] = useState(() => new Set(initial.completed));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const timers = useCookTimers(initial.timers, recipe.title);
  const wakeLockFailed = useWakeLock();
  const voiceSupported = useVoiceSupported();
  const mainRef = useRef<HTMLElement>(null);

  const total = recipe.steps.length;
  const onOverview = step < 0;
  const finished = step >= total;

  const segments = useMemo(() => recipe.steps.map((s) => segmentStep(s)), [recipe.steps]);
  const stepIngredients = useMemo(
    () => recipe.steps.map((s) => ingredientsForStep(s, recipe.ingredients)),
    [recipe.steps, recipe.ingredients]
  );
  const scaledLines = useMemo(
    () => recipe.ingredients.map((line) => scaleIngredient(line, scale)),
    [recipe.ingredients, scale]
  );
  const timerCount = segments.reduce((n, segs) => n + segs.filter((s) => s.type === "timer").length, 0);

  // Persist progress so a reload keeps your place.
  useEffect(() => {
    const data: SavedSession = {
      step,
      scale,
      checked: [...checked],
      completed: [...completed],
      timers: timers.timers,
    };
    try {
      sessionStorage.setItem(storageKey(recipe._id), JSON.stringify(data));
    } catch {
      // storage full / disabled: progress just isn't kept
    }
  }, [recipe._id, step, scale, checked, completed, timers.timers]);

  // Each step starts at the top.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (finished) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }, [finished]);

  const next = useCallback(() => {
    if (step >= total) return;
    if (step >= 0) setCompleted((prev) => new Set(prev).add(step));
    setStep(step + 1);
  }, [step, total]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(-1, s - 1));
  }, []);

  const goTo = (i: number) => setStep(i);

  const toggleIngredient = useCallback((i: number) => {
    setChecked((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(i)) nextSet.delete(i);
      else nextSet.add(i);
      return nextSet;
    });
  }, []);

  const timerBySource = useMemo(() => {
    const map = new Map<string, CookTimer>();
    timers.timers.forEach((t) => t.sourceKey && map.set(t.sourceKey, t));
    return map;
  }, [timers.timers]);

  const tapTimer = useCallback(
    (stepIndex: number, timerIndex: number) => {
      const seg = segments[stepIndex]?.filter((s) => s.type === "timer")[timerIndex];
      if (!seg || seg.type !== "timer") return false;
      const key = `s${stepIndex}-t${timerIndex}`;
      const existing = timerBySource.get(key);
      const label = `${seg.label} · step ${stepIndex + 1}`;
      if (existing?.status === "running") {
        toast(`${label} is already running`);
      } else if (existing?.status === "paused") {
        timers.resume(existing.id);
      } else {
        timers.start(label, seg.seconds, key);
        toast.success(`${label}: ${formatDuration(seg.seconds)} started`);
      }
      return true;
    },
    [segments, timerBySource, timers]
  );

  const startManual = (minutes: number) => {
    const label = step >= 0 && step < total ? `Timer · step ${step + 1}` : "Timer";
    timers.start(label, Math.round(minutes * 60));
  };

  const readCurrent = useCallback(() => {
    if (onOverview) speak(`${recipe.title}. ${total} steps. Say next to start.`);
    else if (finished) speak("All done. Enjoy your meal!");
    else speak(`Step ${step + 1}. ${recipe.steps[step]}`);
  }, [onOverview, finished, recipe.title, recipe.steps, step, total]);

  const handleVoice = useCallback(
    (command: VoiceCommand) => {
      switch (command) {
        case "next":
          return next();
        case "back":
          return prev();
        case "repeat":
          return readCurrent();
        case "ingredients":
          return setSheetOpen(true);
        case "stop":
          setVoiceOn(false);
          toast("Voice control off");
          return;
        case "timer":
          if (step < 0 || step >= total || !tapTimer(step, 0)) toast("No timer in this step");
          return;
      }
    },
    [next, prev, readCurrent, step, total, tapTimer]
  );

  const onVoiceFatal = useCallback((message: string) => {
    setVoiceOn(false);
    toast.error(message);
  }, []);

  const { lastHeard } = useVoiceCommands(voiceOn, handleVoice, onVoiceFatal);

  // Keyboard: ← → and Space
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === " " && !target?.closest("button, a, [role=checkbox]")) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, sheetOpen]);

  // Swipe left/right on touch
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("button, a, input, [data-no-swipe]")) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || finished) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
    }
  };

  const exit = () => {
    if (window.history.length > 1) router.back();
    else router.push("/prototype/cook");
  };

  const progress = finished ? 100 : onOverview ? 0 : ((step + 1) / (total + 1)) * 100;
  const currentIngredients = !onOverview && !finished ? stepIngredients[step] : [];
  const highlight = new Set(currentIngredients);
  const runningCount = timers.timers.filter((t) => t.status !== "done").length;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-background">
        <div className="flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
          <Button variant="ghost" size="icon" onClick={exit} aria-label="Exit cook mode">
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold leading-tight">{recipe.title}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {finished ? "Finished" : onOverview ? "Get ready" : `Step ${step + 1} of ${total}`}
              {scale !== 1 && <span className="text-primary"> · {scaleLabel(scale)}</span>}
              {wakeLockFailed && <span className="text-xs"> · Screen may sleep</span>}
            </p>
          </div>
          <ScaleControl value={scale} onChange={setScale} className="hidden md:flex" />
          <VoiceToggle supported={voiceSupported} on={voiceOn} onChange={setVoiceOn} />
          <ManualTimerButton onStart={startManual} />
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setSheetOpen(true)}
            aria-label="Ingredients"
          >
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Ingredients</span>
          </Button>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
        {voiceOn && (
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-1 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>Listening</span>
            {lastHeard && <span className="truncate">· heard “{lastHeard}”</span>}
          </div>
        )}
      </header>

      {/* Timers (mobile: under header) */}
      <TimerTray
        api={timers}
        className="flex shrink-0 gap-2 overflow-x-auto border-b bg-muted/30 px-3 py-2 lg:hidden"
      />

      <div className="flex min-h-0 flex-1">
        {/* Step rail (desktop) */}
        <nav aria-label="Steps" className="hidden w-64 shrink-0 overflow-y-auto border-r p-3 lg:block xl:w-72">
          <button
            type="button"
            onClick={() => goTo(-1)}
            className={cn(
              "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
              onOverview && "bg-primary/10 font-medium text-primary"
            )}
          >
            <ChefHat className="h-4 w-4" /> Get ready
          </button>
          <ol className="space-y-1">
            {recipe.steps.map((s, i) => {
              const active = i === step;
              const done = completed.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                      active && "bg-primary/10"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                        active && "border-primary text-primary",
                        done && !active && "border-transparent bg-primary/15 text-primary"
                      )}
                    >
                      {done && !active ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className={cn("line-clamp-2", active ? "text-foreground" : "text-muted-foreground")}>
                      {s}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Current step */}
        <main
          ref={mainRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
          className="min-w-0 flex-1 touch-pan-y overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
            {finished ? (
              <div className="flex flex-col items-center py-8 text-center">
                <PartyPopper className="mb-4 h-12 w-12 text-primary" />
                <h2 className="text-3xl font-bold sm:text-4xl">Bon appétit!</h2>
                <p className="mt-3 max-w-md text-lg text-muted-foreground">
                  You cooked <span className="font-medium text-foreground">{recipe.title}</span>. Enjoy it.
                </p>
                {runningCount > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {runningCount === 1 ? "A timer is" : `${runningCount} timers are`} still running — keep an eye on the tray.
                  </p>
                )}
                <div className="mt-8 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                  <Button asChild size="lg" className="flex-1">
                    <Link href={`/recipe/${recipe._id}`}>Back to recipe</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="flex-1">
                    <Link href="/prototype/cook">Cook something else</Link>
                  </Button>
                </div>
                <Button variant="link" className="mt-2 text-muted-foreground" onClick={prev}>
                  <ArrowLeft className="h-4 w-4" /> Back to the last step
                </Button>
              </div>
            ) : onOverview ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold">Get ready</h2>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground">
                    {recipe.cookingTime ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {formatMinutes(recipe.cookingTime)}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <ListOrdered className="h-4 w-4" /> {total} steps
                    </span>
                    {timerCount > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <TimerIcon className="h-4 w-4" /> {timerCount} {timerCount === 1 ? "timer" : "timers"}
                      </span>
                    )}
                    {recipe.difficulty && <span>{recipe.difficulty}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Scale</p>
                    <p className="text-sm text-muted-foreground">Quantities update everywhere.</p>
                  </div>
                  <ScaleControl value={scale} onChange={setScale} />
                </div>

                <section>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold">Ingredients</h3>
                    <span className="text-sm text-muted-foreground">
                      {checked.size} of {recipe.ingredients.length} ready
                    </span>
                  </div>
                  <IngredientChecklist lines={scaledLines} checked={checked} onToggle={toggleIngredient} large />
                </section>

                <p className="text-sm text-muted-foreground">
                  Tip: tap a time in a step to start a timer. Swipe, or use ← → on a keyboard, to move between steps.
                </p>
              </div>
            ) : (
              <article key={step}>
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">
                  Step {step + 1}
                  <span className="font-normal text-muted-foreground"> of {total}</span>
                </p>
                <p className="text-2xl leading-[1.6] sm:text-3xl sm:leading-[1.55]">
                  {(() => {
                    let t = -1;
                    return segments[step].map((seg, j) => {
                      if (seg.type === "text") return <span key={j}>{seg.text}</span>;
                      t += 1;
                      const timerIndex = t;
                      return (
                        <TimerChip
                          key={j}
                          segment={seg}
                          timer={timerBySource.get(`s${step}-t${timerIndex}`)}
                          now={timers.now}
                          onTap={() => tapTimer(step, timerIndex)}
                        />
                      );
                    });
                  })()}
                </p>

                {currentIngredients.length > 0 && (
                  <section className="mt-10">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      You&apos;ll need
                      {scale !== 1 && <span className="ml-2 normal-case text-primary">scaled {scaleLabel(scale)}</span>}
                    </h3>
                    <IngredientChecklist
                      lines={scaledLines}
                      indices={currentIngredients}
                      checked={checked}
                      onToggle={toggleIngredient}
                      large
                    />
                  </section>
                )}
              </article>
            )}
          </div>
        </main>

        {/* Full ingredient list (desktop) */}
        <aside
          aria-label="Ingredients and timers"
          className={cn(
            "hidden w-80 shrink-0 flex-col border-l",
            // The overview already shows the full list in the middle, so
            // there the column only appears to hold running timers
            (!onOverview || timers.timers.length > 0) && "lg:flex"
          )}
        >
          {onOverview ? (
            <div className="flex-1" />
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold">Ingredients</h2>
                <span className="text-xs text-muted-foreground">
                  {checked.size}/{recipe.ingredients.length}
                </span>
              </div>
              <IngredientChecklist
                lines={scaledLines}
                checked={checked}
                onToggle={toggleIngredient}
                highlight={highlight}
              />
            </div>
          )}
          {/* Timers (desktop): pinned under the list so they never cover it */}
          <TimerTray
            api={timers}
            className="flex shrink-0 flex-col gap-2 border-t bg-muted/30 p-3"
          />
        </aside>
      </div>

      {/* Bottom bar */}
      {!finished && (
        <footer className="shrink-0 border-t bg-background px-3 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-4">
          <div className="mx-auto flex max-w-3xl gap-3">
            {onOverview ? (
              <Button size="lg" className="h-14 flex-1 text-lg" onClick={next}>
                Start cooking <ArrowRight className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="lg" className="h-14 flex-1 text-lg" onClick={prev}>
                  <ArrowLeft className="h-5 w-5" /> {step === 0 ? "Overview" : "Back"}
                </Button>
                <Button size="lg" className="h-14 flex-[2] text-lg" onClick={next}>
                  {step === total - 1 ? (
                    <>
                      Finish <Check className="h-5 w-5" />
                    </>
                  ) : (
                    <>
                      Next <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </footer>
      )}

      {/* Ingredients sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Ingredients</SheetTitle>
            <SheetDescription>
              {checked.size} of {recipe.ingredients.length} checked
            </SheetDescription>
            <ScaleControl value={scale} onChange={setScale} className="mt-2" />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <IngredientChecklist
              lines={scaledLines}
              checked={checked}
              onToggle={toggleIngredient}
              highlight={highlight}
              large
            />
          </div>
          {checked.size > 0 && (
            <div className="border-t p-4">
              <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
                Clear checks
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// --- Loader -----------------------------------------------------------------

export function CookMode({ id }: { id: string }) {
  const recipe = useQuery(api.recipes.get, { id: id as Id<"recipes"> });

  if (recipe === undefined) {
    return (
      <div className="flex h-dvh items-center justify-center" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading recipe</span>
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <ChefHat className="h-10 w-10 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">Recipe not found</h1>
          <p className="text-muted-foreground">It may have been deleted or made private.</p>
        </div>
        <Button asChild>
          <Link href="/prototype/cook">Pick another recipe</Link>
        </Button>
      </div>
    );
  }

  return <CookSession key={recipe._id} recipe={recipe} />;
}
