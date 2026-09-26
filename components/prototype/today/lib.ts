// PROTOTYPE — pure helpers for the "Today" hub: week maths, next-meal choice
// and the staples/shopping-list aware "what do I need to buy" split.
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { pantryTermMatches } from "@/convex/ingredientMatch";
import { extractItemName } from "@/convex/categories";

export type Overview = NonNullable<FunctionReturnType<typeof api.prototype.today.overview>>;
export type Meal = Overview["meals"][number];
export type PlannedRecipe = Meal["recipe"];
export type OpenItem = Overview["shopping"]["open"][number];

export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

/** Monday = 0 … Sunday = 6 */
export function dayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function mealOrder(mealType: string) {
  const i = MEAL_TYPES.indexOf(mealType as MealType);
  return i === -1 ? MEAL_TYPES.length : i;
}

/** Which meal slot "now" belongs to: before 10:30 breakfast, before 15:00 lunch, else dinner. */
export function currentSlot(date: Date): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 10 * 60 + 30) return "breakfast";
  if (minutes < 15 * 60) return "lunch";
  return "dinner";
}

export function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** The real calendar date of each weekday in the current (Mon–Sun) week. */
export function weekDates(now: Date): Date[] {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - dayIndex(now));
  return WEEK_DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function sortMeals<T extends { mealType: string }>(meals: T[]): T[] {
  return [...meals].sort((a, b) => mealOrder(a.mealType) - mealOrder(b.mealType));
}

/**
 * The meal the hero should show: today's meal in the current slot or the next
 * one later today. Returns the rest of today's upcoming meals as well.
 */
export function pickUpNext(meals: Meal[], now: Date) {
  const today = WEEK_DAYS[dayIndex(now)];
  const slot = mealOrder(currentSlot(now));
  const upcoming = sortMeals(meals.filter((m) => m.day === today)).filter(
    (m) => mealOrder(m.mealType) >= slot
  );
  return { next: upcoming[0] ?? null, later: upcoming.slice(1) };
}

const lower = (s: string) => s.trim().toLowerCase();

/** The staple that covers an ingredient line, if any. */
export function matchingStaple(staples: string[], line: string, keys?: string[]) {
  return staples.find((s) => pantryTermMatches(s, line, keys)) ?? null;
}

/** The open shopping-list item that already covers an ingredient line, if any. */
export function matchingListItem(open: OpenItem[], line: string, keys?: string[]) {
  return (
    open.find((item) => {
      const name = extractItemName(item.ingredient);
      return name.length > 1 && pantryTermMatches(name, line, keys);
    }) ?? null
  );
}

/** "You have X of Y" for one recipe, based on staples only. */
export function haveVsMissing(recipe: PlannedRecipe, staples: string[]) {
  const have: string[] = [];
  const missing: string[] = [];
  recipe.ingredients.forEach((line, i) => {
    if (matchingStaple(staples, line, recipe.ingredientKeys?.[i])) have.push(line);
    else missing.push(line);
  });
  return { have, missing, total: recipe.ingredients.length };
}

/** Short, human name for an ingredient line ("2 tbsp olive oil" -> "olive oil"). */
export function shortName(line: string) {
  const name = extractItemName(line).split(",")[0].replace(/\(.*?\)/g, "").trim();
  return name || line;
}

export type ShopLine = {
  key: string;
  line: string;
  recipeId: PlannedRecipe["_id"];
  recipeTitle: string;
} & (
  | { status: "buy" }
  | { status: "staple"; reason: string }
  | { status: "listed"; reason: string }
);

export type ShopGroup = {
  recipeId: PlannedRecipe["_id"];
  title: string;
  imageUrl: string | null;
  /** e.g. ["Sat dinner", "Sun lunch"] when a recipe is planned more than once */
  slots: string[];
  lines: ShopLine[];
};

/**
 * Split the ingredients of the given meals into "to buy", "you have it (staple)"
 * and "already on your list". A recipe planned twice is listed once (both slots
 * are shown); identical lines inside a recipe are collapsed.
 */
export function buildShopPlan(meals: Meal[], staples: string[], open: OpenItem[]) {
  const groups = new Map<string, ShopGroup>();
  for (const meal of meals) {
    const r = meal.recipe;
    const slot = `${meal.day.slice(0, 3)} ${meal.mealType}`;
    const existing = groups.get(r._id);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }
    const seen = new Set<string>();
    const lines: ShopLine[] = [];
    r.ingredients.forEach((line, i) => {
      if (!line.trim() || seen.has(lower(line))) return;
      seen.add(lower(line));
      const keys = r.ingredientKeys?.[i];
      const base = { key: `${r._id}:${i}`, line, recipeId: r._id, recipeTitle: r.title };
      const staple = matchingStaple(staples, line, keys);
      if (staple) {
        lines.push({ ...base, status: "staple", reason: staple });
        return;
      }
      const listed = matchingListItem(open, line, keys);
      if (listed) {
        lines.push({ ...base, status: "listed", reason: listed.ingredient });
        return;
      }
      lines.push({ ...base, status: "buy" });
    });
    groups.set(r._id, {
      recipeId: r._id,
      title: r.title,
      imageUrl: r.imageUrl,
      slots: [slot],
      lines,
    });
  }
  const all = [...groups.values()].flatMap((g) => g.lines);
  return {
    groups: [...groups.values()],
    counts: {
      buy: all.filter((l) => l.status === "buy").length,
      staple: all.filter((l) => l.status === "staple").length,
      listed: all.filter((l) => l.status === "listed").length,
    },
  };
}

/** Meals from today through Sunday (or the whole week). */
export function mealsForShopping(meals: Meal[], now: Date, includeEarlier: boolean) {
  const today = dayIndex(now);
  return [...meals]
    .filter((m) => includeEarlier || WEEK_DAYS.indexOf(m.day as never) >= today)
    .sort(
      (a, b) =>
        WEEK_DAYS.indexOf(a.day as never) - WEEK_DAYS.indexOf(b.day as never) ||
        mealOrder(a.mealType) - mealOrder(b.mealType)
    );
}
