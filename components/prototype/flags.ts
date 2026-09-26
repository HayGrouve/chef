"use client";

// PROTOTYPE — opt-in flags stored in localStorage so a prototype can be
// switched on across the whole app without touching the real code paths.
import { useSyncExternalStore } from "react";

const EVENT = "chef-prototype-flags";

export type PrototypeFlag = "commandPalette";

const key = (flag: PrototypeFlag) => `chef:prototype:${flag}`;

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setPrototypeFlag(flag: PrototypeFlag, enabled: boolean) {
  if (enabled) localStorage.setItem(key(flag), "on");
  else localStorage.removeItem(key(flag));
  window.dispatchEvent(new Event(EVENT));
}

export function usePrototypeFlag(flag: PrototypeFlag): boolean {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key(flag)) === "on",
    () => false
  );
}
