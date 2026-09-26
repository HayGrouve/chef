// PROTOTYPE — text helpers for /prototype routes. Recipes store ingredients
// and steps as plain strings, so these work on the text heuristically. A
// production version would store structured quantities instead.
import { extractItemName } from "@/convex/categories";
import { toWords } from "@/convex/ingredientMatch";

// --- Scaling ----------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125,
};

// "1 1/2", "1½", "½", "1/2", "1.5", "2-3", "600g" (number glued to a unit)
const LEADING_QUANTITY =
  /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*[¼½¾⅓⅔⅛]|\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?/;

function parseAmount(text: string): number {
  const t = text.trim().replace(",", ".");
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = t.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const unicode = t.match(/^(\d*)([¼½¾⅓⅔⅛])$/);
  if (unicode) return Number(unicode[1] || 0) + UNICODE_FRACTIONS[unicode[2]];
  return Number(t);
}

function formatAmount(value: number, wholeUnits: boolean): string {
  if (wholeUnits && value >= 10) return String(Math.round(value));
  const whole = Math.floor(value + 1e-9);
  const rest = value - whole;
  const nice = Object.entries(UNICODE_FRACTIONS).find(([, f]) => Math.abs(rest - f) < 0.04);
  if (rest < 0.04) return String(whole);
  if (rest > 0.96) return String(whole + 1);
  if (nice) return `${whole || ""}${nice[0]}`;
  return String(Math.round(value * 10) / 10);
}

/** Scales the leading quantity of an ingredient line: ("600g chicken", 1.5) -> "900g chicken". */
export function scaleIngredient(line: string, factor: number): string {
  if (factor === 1) return line;
  const match = line.match(LEADING_QUANTITY);
  if (!match) return line;
  const rest = line.slice(match[0].length);
  // Metric weights/volumes read better as whole numbers
  const wholeUnits = /^\s*(g|kg|ml|l|grams?|liters?)\b/i.test(rest);
  const low = formatAmount(parseAmount(match[1]) * factor, wholeUnits);
  const high = match[2] ? `-${formatAmount(parseAmount(match[2]) * factor, wholeUnits)}` : "";
  return `${low}${high}${rest}`;
}

export function hasQuantity(line: string): boolean {
  return LEADING_QUANTITY.test(line);
}

// --- Timers -----------------------------------------------------------------

const TIME_PATTERN =
  /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;

const COOKING_VERBS = [
  "simmer", "bake", "boil", "cook", "fry", "sear", "roast", "rest", "marinate",
  "reduce", "chill", "refrigerate", "steam", "grill", "toast", "stir", "whisk",
  "knead", "proof", "rise", "soak", "cool", "brown", "sauté", "saute", "poach",
  "blanch", "microwave", "heat", "preheat", "caramelize", "braise", "stew", "fold",
];

export type StepSegment =
  | { type: "text"; text: string }
  | { type: "timer"; text: string; seconds: number; label: string };

function secondsFor(amount: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("h")) return Math.round(amount * 3600);
  if (u.startsWith("s")) return Math.round(amount);
  return Math.round(amount * 60);
}

/** Name a timer after the cooking verb just before the time, e.g. "Simmer". */
function labelFor(textBefore: string, fallback: string): string {
  const clause = textBefore.split(/[.;:!?]/).pop() ?? "";
  const words = clause.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  for (let i = words.length - 1; i >= 0; i--) {
    if (COOKING_VERBS.includes(words[i])) {
      return words[i][0].toUpperCase() + words[i].slice(1);
    }
  }
  return fallback;
}

/**
 * Splits a step into text and tappable timer segments. Ranges ("6-8 minutes")
 * use the lower bound so the cook checks early rather than late.
 */
export function segmentStep(step: string, fallbackLabel = "Timer"): StepSegment[] {
  const segments: StepSegment[] = [];
  let last = 0;
  for (const match of step.matchAll(TIME_PATTERN)) {
    const index = match.index ?? 0;
    const seconds = secondsFor(Number(match[1]), match[3]);
    if (seconds <= 0 || seconds > 24 * 3600) continue;
    if (index > last) segments.push({ type: "text", text: step.slice(last, index) });
    segments.push({
      type: "timer",
      text: match[0],
      seconds,
      label: labelFor(step.slice(0, index), fallbackLabel),
    });
    last = index + match[0].length;
  }
  if (last < step.length) segments.push({ type: "text", text: step.slice(last) });
  return segments;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

// --- Ingredients used in a step ---------------------------------------------

const DESCRIPTORS = new Set([
  "fresh", "large", "small", "medium", "ripe", "finely", "roughly", "thinly",
  "chopped", "minced", "sliced", "diced", "grated", "crushed", "canned",
  "ground", "dried", "melted", "plain", "whole", "extra", "virgin", "mixed",
  "all", "purpose", "cold", "warm", "hot", "boneless", "skinless", "skin",
  "on", "optional", "of", "to", "taste", "serve", "juice", "zest", "a", "the",
]);

/** Name variants to look for in step text: full name, head noun, first word. */
function ingredientNames(line: string): string[][] {
  const base = extractItemName(line)
    .split(/,|\(|\bto serve\b|\bto taste\b/i)[0]
    .replace(/^(juice|zest) of\s+(\d+\s+)?/i, "");
  return base
    .split(/\band\b|\bor\b|\//i)
    .flatMap((part) => {
      const words = toWords(part).filter((w) => !DESCRIPTORS.has(w) && !/^\d/.test(w));
      if (words.length === 0) return [];
      const variants = [words, [words[words.length - 1]]];
      if (words.length > 1 && words[0].length >= 4) variants.push([words[0]]);
      return variants;
    });
}

function containsSequence(haystack: string[], needle: string[]) {
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

/** Indices of the ingredient lines a step mentions. */
export function ingredientsForStep(step: string, ingredients: string[]): number[] {
  const stepWords = toWords(step);
  return ingredients.flatMap((line, i) =>
    ingredientNames(line).some((name) => containsSequence(stepWords, name)) ? [i] : []
  );
}
