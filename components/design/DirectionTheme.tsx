"use client";

import { useDirectionTheme } from "./shared";

/** Applies a direction's tokens (and font variables) to <html> while mounted. */
export function DirectionTheme({ className }: { className: string }) {
  useDirectionTheme(className);
  return null;
}
