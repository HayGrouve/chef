"use client";

// PROTOTYPE — client-only state for the "Today" hub: staples (localStorage)
// and a minute-resolution clock.
import { useCallback, useMemo, useSyncExternalStore } from "react";

// NOTE: prototype only. Staples live in localStorage so the idea can be tried
// without a schema change; production would store them server-side (e.g. a
// `staples` array on a user profile doc) so they sync across devices and can
// be used by the pantry search, planner and shopping list too.
const STAPLES_KEY = "chef:prototype:staples";
const STAPLES_EVENT = "chef-prototype-staples";

export const STAPLE_SUGGESTIONS = [
  "salt",
  "black pepper",
  "olive oil",
  "butter",
  "garlic",
  "onion",
  "flour",
  "sugar",
  "eggs",
  "rice",
  "soy sauce",
  "milk",
];

const EMPTY: string[] = [];
let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function readStaples(): string[] {
  const raw = localStorage.getItem(STAPLES_KEY);
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedValue = Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

function subscribeStaples(callback: () => void) {
  window.addEventListener(STAPLES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STAPLES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function writeStaples(next: string[]) {
  localStorage.setItem(STAPLES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(STAPLES_EVENT));
}

export function useStaples() {
  const staples = useSyncExternalStore(subscribeStaples, readStaples, () => EMPTY);

  const add = useCallback((value: string) => {
    const item = value.trim().toLowerCase();
    if (!item) return false;
    const current = readStaples();
    if (current.includes(item)) return false;
    writeStaples([...current, item]);
    return true;
  }, []);

  const remove = useCallback((value: string) => {
    writeStaples(readStaples().filter((s) => s !== value));
  }, []);

  const restore = useCallback((list: string[]) => writeStaples(list), []);

  return { staples, add, remove, restore };
}

// Clock that ticks once a minute; null during SSR so time-based UI is client-only.
function subscribeMinute(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  return () => window.clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / 60_000);

export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, () => null);
  return useMemo(() => (minute === null ? null : new Date(minute * 60_000)), [minute]);
}
