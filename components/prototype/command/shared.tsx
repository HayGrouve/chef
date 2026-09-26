"use client";

// PROTOTYPE — small helpers shared by the command palette and its demo page.
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export const OPEN_EVENT = "chef:open-command-palette";

/** Open the palette from anywhere (buttons, touch devices). */
export function openCommandPalette(search?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { search } }));
}

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export function todayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

/** Every whitespace-separated token of the query appears somewhere in the text. */
export function matches(query: string, ...texts: (string | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

const noop = () => () => {};

/** "⌘" on Apple platforms, "Ctrl" elsewhere. Null during SSR/hydration. */
export function useModKey(): string | null {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl"),
    () => null
  );
}
