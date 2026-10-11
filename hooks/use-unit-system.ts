"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { UnitSystem } from "@/lib/quantities";

// A kitchen either has cups or a scale, so the choice is remembered across
// recipes (unlike the scale, which is per recipe).
const KEY = "unitSystem";
const EVENT = "unit-system-change";

function read(): UnitSystem {
  try {
    return localStorage.getItem(KEY) === "metric" ? "metric" : "original";
  } catch {
    return "original";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useUnitSystem() {
  const system = useSyncExternalStore(subscribe, read, () => "original" as const);
  const setSystem = useCallback((next: UnitSystem) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // storage disabled: the choice just isn't remembered
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [system, setSystem] as const;
}
