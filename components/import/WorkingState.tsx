"use client";

// Smart Import: what the user sees while a draft is being made.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SourceKind } from "./lib";

export type WorkingStage = "uploading" | "reading";

// Honest, coarse descriptions of what is happening. They advance on a timer
// and stop at the last one rather than looping or pretending to a percentage.
const MESSAGES: Record<SourceKind, string[]> = {
  link: [
    "Отварям страницата…",
    "Търся рецептата…",
    "Чета съставките и стъпките…",
    "Няма готови данни? Тогава AI чете страницата…",
    "Още чета. Дългите страници отнемат малко повече…",
  ],
  text: [
    "Чета текста ти…",
    "Намирам съставките…",
    "Разделям стъпките…",
    "Още работя. Обикновено отнема няколко секунди…",
  ],
  photo: [
    "Чета страницата…",
    "Намирам съставките…",
    "Чета стъпките…",
    "Още работя. Ръкописът отнема малко повече…",
  ],
};

const STEP_MS = 2600;

export function WorkingState({
  kind,
  stage,
  onCancel,
}: {
  kind: SourceKind;
  stage: WorkingStage;
  onCancel: () => void;
}) {
  const [index, setIndex] = useState(0);
  const messages = MESSAGES[kind];

  useEffect(() => {
    if (stage !== "reading") return;
    const timer = setInterval(
      () => setIndex((i) => Math.min(i + 1, messages.length - 1)),
      STEP_MS
    );
    return () => clearInterval(timer);
  }, [stage, messages.length]);

  const status = stage === "uploading" ? "Качвам снимката…" : messages[index];

  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          {/* One live region for the whole run; only its text changes, so each message is read. */}
          <p role="status" className="truncate text-sm font-medium">
            <span key={status} className="motion-safe:animate-in fade-in">
              {status}
            </span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Отказ
        </Button>
      </div>

      {/* Shape of the review step, so the draft "fills in" where it will appear */}
      {[
        ["w-2/3", "w-full"],
        ["w-1/2", "w-5/6", "w-2/3", "w-3/4", "w-1/2"],
        ["w-full", "w-11/12", "w-4/5"],
      ].map((lines, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-xs md:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="mt-4 space-y-3 md:pl-10">
            {lines.map((w, j) => (
              <Skeleton key={j} className={`h-9 ${w}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
