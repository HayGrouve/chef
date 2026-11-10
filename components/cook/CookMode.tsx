"use client";

// Cook mode: one step at a time, per-step scaled ingredients, tap-to-start
// named timers, scaling, voice control and a resilient wake lock.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatDuration,
  ingredientsForStep,
  segmentStep,
  type StepSegment,
} from "@/lib/recipe-text";
import { difficultyLabel } from "@/lib/labels";
import { cn, pluralize } from "@/lib/utils";
import { formatIngredients, type UnitSystem } from "@/lib/quantities";
import { useUnitSystem } from "@/hooks/use-unit-system";
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
    // A finished session doesn't resume: "Start cooking" starts over
    if (typeof s.step === "number" && s.step >= m) return fallback;
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
      aria-label="Количества"
      className={className}
    >
      {SCALES.map((s) => (
        <ToggleGroupItem
          key={s}
          value={String(s)}
          aria-label={`Количества ${scaleLabel(s)}`}
          // Announced as radio buttons, so arrow keys should select, not just move focus
          onFocus={() => s !== value && onChange(s)}
          className="px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {scaleLabel(s)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function UnitsControl({
  value,
  onChange,
  className,
}: {
  value: UnitSystem;
  onChange: (v: UnitSystem) => void;
  className?: string;
}) {
  const options: { value: UnitSystem; label: string }[] = [
    { value: "original", label: "Както е писано" },
    { value: "metric", label: "Метрични" },
  ];
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => v && onChange(v as UnitSystem)}
      aria-label="Мерки"
      className={className}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          onFocus={() => o.value !== value && onChange(o.value)}
          className="px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {o.label}
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
          ? `Пусни таймер ${segment.label}, ${segment.text}`
          : `Таймер ${segment.label}, ${TIMER_STATE[state as CookTimer["status"]]}, остават ${formatDuration(remainingSeconds(timer!, now))}`
      }
      className={cn(
        "mx-0.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-0 align-baseline font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        state === "idle" && "bg-primary/10 text-primary hover:bg-primary/20",
        state === "running" && "bg-primary text-primary-foreground",
        state === "paused" && "bg-primary/20 text-primary",
        state === "done" && "motion-safe:animate-pulse bg-primary text-primary-foreground"
      )}
    >
      <Clock className="h-[0.8em] w-[0.8em] shrink-0" />
      <span className="tabular-nums">
        {state === "idle" ? segment.text : state === "done" ? "Готово" : formatDuration(remainingSeconds(timer!, now))}
      </span>
    </button>
  );
}

const MAX_TIMER_MINUTES = 24 * 60;

const TIMER_STATE: Record<CookTimer["status"], string> = {
  running: "върви",
  paused: "на пауза",
  done: "готово",
};

function ManualTimerButton({ onStart }: { onStart: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("5");
  const start = (m: number) => {
    // Cap at a day: huge values overflow the countdown display
    if (!Number.isFinite(m) || m <= 0 || m > MAX_TIMER_MINUTES) return;
    onStart(m);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Добави таймер">
              <TimerReset className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Добави таймер</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(Number(minutes));
          }}
        >
          <p className="text-sm font-medium">Нов таймер</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 3, 5, 10, 15, 30].map((m) => (
              <Button
                key={m}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => start(m)}
                aria-label={pluralize(m, "минута", "минути")}
              >
                {m}&nbsp;мин
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0.5"
              max={MAX_TIMER_MINUTES}
              step="0.5"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              aria-label="Минути"
            />
            <Button type="submit">Пусни</Button>
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
            <Toggle disabled aria-label="Гласовото управление не е достъпно" className="h-9 w-9">
              <MicOff className="h-5 w-5" />
            </Toggle>
          </span>
        </TooltipTrigger>
        <TooltipContent>Гласът иска Chrome или Edge</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          pressed={on}
          onPressedChange={onChange}
          aria-label="Гласово управление"
          className="h-9 w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Mic className="h-5 w-5" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        {on ? "Спри да слушаш" : "Без ръце: кажи „напред“, „назад“, „повтори“, „таймер“"}
      </TooltipContent>
    </Tooltip>
  );
}

function formatMinutes(total: number) {
  if (total < 60) return `${total}\u00A0мин`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}\u00A0ч ${m}\u00A0мин` : `${h}\u00A0ч`;
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
  const mainRef = useRef<HTMLDivElement>(null);

  const total = recipe.steps.length;
  // If the owner removes steps mid-cook, stay on the last real step rather
  // than jumping to "Finished" (only someone already finished stays finished)
  const [seenTotal, setSeenTotal] = useState(total);
  if (seenTotal !== total) {
    setSeenTotal(total);
    if (step >= total && step < seenTotal) setStep(total - 1);
  }
  const onOverview = step < 0;
  const finished = step >= total;

  const segments = useMemo(() => recipe.steps.map((s) => segmentStep(s)), [recipe.steps]);
  const stepIngredients = useMemo(
    () => recipe.steps.map((s) => ingredientsForStep(s, recipe.ingredients)),
    [recipe.steps, recipe.ingredients]
  );
  const [unitSystem, setUnitSystem] = useUnitSystem();
  const { lines: scaledLines, canConvert } = useMemo(
    () => formatIngredients(recipe.ingredients, recipe.ingredientAmounts, { scale, system: unitSystem }),
    [recipe.ingredients, recipe.ingredientAmounts, scale, unitSystem]
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
    if (finished) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, disableForReducedMotion: true });
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
      const label = `${seg.label} · стъпка ${stepIndex + 1}`;
      if (existing?.status === "running") {
        toast(`${label} вече върви`);
      } else if (existing?.status === "paused") {
        timers.resume(existing.id);
      } else {
        timers.start(label, seg.seconds, key);
        toast.success(`${label}: ${formatDuration(seg.seconds)}, пуснат`);
      }
      return true;
    },
    [segments, timerBySource, timers]
  );

  const startManual = (minutes: number) => {
    const label = step >= 0 && step < total ? `Таймер · стъпка ${step + 1}` : "Таймер";
    timers.start(label, Math.round(minutes * 60));
  };

  const readCurrent = useCallback(() => {
    if (onOverview) speak(recipe.title, `${pluralize(total, "стъпка", "стъпки")}. Кажи „напред“, за да започнеш.`);
    else if (finished) speak("Готово. Добър апетит!");
    else speak(`Стъпка ${step + 1}.`, recipe.steps[step]);
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
          toast("Гласовото управление е спряно");
          return;
        case "timer":
          if (step < 0 || step >= total || !tapTimer(step, 0)) toast("В тази стъпка няма таймер");
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
      if (sheetOpen || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      // Controls that use the arrow keys themselves (e.g. the scale picker)
      if (
        target?.closest(
          "input, textarea, select, [contenteditable=true], [role=dialog], [role=radiogroup], [role=slider], [role=tablist], [role=menu], [role=listbox]"
        )
      ) {
        return;
      }
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
    else router.push(`/recipe/${recipe._id}`);
  };

  const progress = finished ? 100 : onOverview ? 0 : ((step + 1) / (total + 1)) * 100;
  const currentIngredients = !onOverview && !finished ? stepIngredients[step] : [];
  const highlight = new Set(currentIngredients);
  const runningCount = timers.timers.filter((t) => t.status !== "done").length;

  return (
    <div data-cook-mode className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-background">
        <div className="flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
          <Button variant="ghost" size="icon" onClick={exit} aria-label="Излез от готвенето">
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold leading-tight">{recipe.title}</h1>
            <div className="flex min-w-0 items-center text-sm text-muted-foreground">
              {finished ? (
                "Готово"
              ) : (
                // Jump to any step without a permanent step list on screen
                <DropdownMenu>
                  <DropdownMenuTrigger className="-ml-1 flex items-center gap-0.5 rounded px-1 hover:bg-muted hover:text-foreground">
                    {onOverview ? "Подготовка" : `Стъпка ${step + 1} от ${total}`}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[60vh] w-80 overflow-y-auto">
                    <DropdownMenuItem onSelect={() => goTo(-1)}>
                      <ChefHat /> Подготовка
                    </DropdownMenuItem>
                    {recipe.steps.map((s, i) => (
                      <DropdownMenuItem
                        key={i}
                        onSelect={() => goTo(i)}
                        className={cn("items-start", i === step && "bg-primary/10")}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                            i === step && "border-primary text-primary",
                            completed.has(i) && i !== step && "border-transparent bg-primary/15 text-primary"
                          )}
                        >
                          {completed.has(i) && i !== step ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <span className="line-clamp-2">{s}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <span className="truncate">
                {scale !== 1 && <span className="text-primary"> · {scaleLabel(scale)}</span>}
                {wakeLockFailed && <span className="text-xs"> · Екранът може да заспи</span>}
              </span>
            </div>
          </div>
          <ScaleControl value={scale} onChange={setScale} className="hidden md:flex" />
          <VoiceToggle supported={voiceSupported} on={voiceOn} onChange={setVoiceOn} />
          <ManualTimerButton onStart={startManual} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
            aria-label="Съставки"
          >
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Съставки</span>
          </Button>
        </div>
        <Progress value={progress} aria-label="Напредък" className="h-1 rounded-none" />
        {/* Steps also change by swipe, keyboard and voice: announce where we are. */}
        <p className="sr-only" aria-live="polite">
          {finished ? "Готово" : onOverview ? "Подготовка" : `Стъпка ${step + 1} от ${total}`}
        </p>
        {voiceOn && (
          <div role="status" className="flex items-center gap-2 bg-muted/50 px-4 py-1 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full motion-safe:animate-ping bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>Слушам</span>
            {lastHeard && <span className="truncate">· чух „{lastHeard}“</span>}
          </div>
        )}
      </header>

      {/* Running timers, under the header */}
      <TimerTray
        api={timers}
        className="flex shrink-0 gap-2 overflow-x-auto border-b bg-muted/30 px-3 py-2"
      />

      <div className="flex min-h-0 flex-1">
        {/* Current step */}
        <div
          ref={mainRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
          className="min-w-0 flex-1 touch-pan-y overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
            {finished ? (
              <div className="flex flex-col items-center py-4 text-center motion-safe:animate-in fade-in zoom-in duration-500">
                <div className="relative mb-8 aspect-video w-full max-w-md overflow-hidden rounded-xl shadow-2xl ring-4 ring-primary/20">
                  {recipe.imageUrl ? (
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 448px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ChefHat className="h-20 w-20 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-5">
                    <span className="flex items-center gap-2 text-lg font-bold text-white">
                      <PartyPopper className="h-6 w-6 text-yellow-400" /> Completed!
                    </span>
                  </div>
                </div>
                <h2 className="text-4xl font-bold text-primary md:text-5xl">Добър апетит!</h2>
                <p className="mt-4 max-w-lg text-xl leading-relaxed text-muted-foreground">
                  Сготви <span className="font-semibold text-foreground">{recipe.title}</span>. Време е да му се насладиш!
                </p>
                {runningCount > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {runningCount === 1 ? "Един таймер още върви" : `${runningCount} таймера още вървят`}. Следи ги горе.
                  </p>
                )}
                <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="h-14 w-full text-lg sm:w-auto sm:flex-1">
                    <Link href={`/recipe/${recipe._id}`}>Към рецептата</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-14 w-full text-lg sm:w-auto sm:flex-1">
                    <Link href="/">Сготви нещо друго</Link>
                  </Button>
                </div>
                <Button variant="link" className="mt-3 text-muted-foreground" onClick={prev}>
                  <ArrowLeft className="h-4 w-4" /> Към последната стъпка
                </Button>
              </div>
            ) : onOverview ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold">Подготовка</h2>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground">
                    {recipe.cookingTime ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {formatMinutes(recipe.cookingTime)}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <ListOrdered className="h-4 w-4" /> {pluralize(total, "стъпка", "стъпки")}
                    </span>
                    {timerCount > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <TimerIcon className="h-4 w-4" /> {timerCount} {timerCount === 1 ? "таймер" : "таймера"}
                      </span>
                    )}
                    {recipe.difficulty && <span>{difficultyLabel(recipe.difficulty)}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Количества</p>
                    <p className="text-sm text-muted-foreground">Променят се навсякъде.</p>
                  </div>
                  <ScaleControl value={scale} onChange={setScale} />
                </div>

                {canConvert && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                    <div>
                      <p className="font-medium">Мерки</p>
                      <p className="text-sm text-muted-foreground">
                        Метричните превръщат чашите и лъжиците в грамове и милилитри.
                      </p>
                    </div>
                    <UnitsControl value={unitSystem} onChange={setUnitSystem} />
                  </div>
                )}

                <section>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold">Съставки</h3>
                    <span className="text-sm text-muted-foreground">
                      {checked.size} от {recipe.ingredients.length} готови
                    </span>
                  </div>
                  <IngredientChecklist lines={scaledLines} checked={checked} onToggle={toggleIngredient} large />
                </section>

                <p className="text-sm text-muted-foreground">
                  Съвет: докосни време в стъпка, за да пуснеш таймер. Плъзгай или ползвай ← → на клавиатурата, за да сменяш стъпките.
                </p>
              </div>
            ) : (
              <article key={step}>
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">
                  Стъпка {step + 1}
                  <span className="font-normal text-muted-foreground"> от {total}</span>
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
                      Ще ти трябват
                      {scale !== 1 && <span className="ml-2 normal-case text-primary">количества {scaleLabel(scale)}</span>}
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
        </div>

      </div>

      {/* Bottom bar */}
      {!finished && (
        <footer className="shrink-0 border-t bg-background px-3 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-4">
          <div className="mx-auto flex max-w-3xl gap-3">
            {onOverview ? (
              <Button size="lg" className="h-14 flex-1 text-lg" onClick={next}>
                Започни да готвиш <ArrowRight className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="lg" className="h-14 flex-1 text-lg" onClick={prev}>
                  <ArrowLeft className="h-5 w-5" /> {step === 0 ? "Подготовка" : "Назад"}
                </Button>
                <Button size="lg" className="h-14 flex-[2] text-lg" onClick={next}>
                  {step === total - 1 ? (
                    <>
                      Готово <Check className="h-5 w-5" />
                    </>
                  ) : (
                    <>
                      Напред <ArrowRight className="h-5 w-5" />
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
            <SheetTitle>Съставки</SheetTitle>
            <SheetDescription>
              {checked.size} от {recipe.ingredients.length} отметнати
            </SheetDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <ScaleControl value={scale} onChange={setScale} />
              {canConvert && <UnitsControl value={unitSystem} onChange={setUnitSystem} />}
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            <IngredientChecklist
              lines={scaledLines}
              checked={checked}
              onToggle={toggleIngredient}
              highlight={highlight}
            />
          </div>
          {checked.size > 0 && (
            <div className="border-t p-4">
              <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
                Махни отметките
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
        <span className="sr-only">Зареждам рецептата…</span>
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <ChefHat className="h-10 w-10 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">Няма такава рецепта</h1>
          <p className="text-muted-foreground">Може да е изтрита или лична.</p>
        </div>
        <Button asChild>
          <Link href="/">Към рецептите</Link>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <CookSession key={recipe._id} recipe={recipe} />
    </TooltipProvider>
  );
}
