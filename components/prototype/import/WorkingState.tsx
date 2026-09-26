"use client";

// PROTOTYPE — Smart Import: what the user sees while a draft is being made.
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
    "Opening the page…",
    "Looking for the recipe card…",
    "Reading ingredients and steps…",
    "No recipe card? Then AI reads the page…",
    "Still reading. Long pages take a little longer…",
  ],
  text: [
    "Reading your text…",
    "Finding ingredients…",
    "Separating the steps…",
    "Still working. This usually takes a few seconds…",
  ],
  photo: [
    "Reading the page…",
    "Finding ingredients…",
    "Reading the steps…",
    "Still working. Handwriting takes a little longer…",
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

  const status = stage === "uploading" ? "Uploading your photo…" : messages[index];

  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          <p key={status} role="status" className="truncate text-sm font-medium animate-in fade-in">
            {status}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
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
