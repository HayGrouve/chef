// Bulgarian labels for values stored in English. Difficulty, tags and aisles
// stay English keys in the database (kept recipes need no migration); the UI
// shows these labels. A value without a label (a tag someone typed) shows as is.
import type { PREDEFINED_TAGS } from "./constants";

export const DIFFICULTY_LABELS = {
  Easy: "Лесно",
  Medium: "Средно",
  Hard: "Трудно",
} as const;

export type Difficulty = keyof typeof DIFFICULTY_LABELS;
export const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

export const TAG_LABELS: Record<(typeof PREDEFINED_TAGS)[number], string> = {
  Breakfast: "Закуска",
  Lunch: "Обяд",
  Dinner: "Вечеря",
  Dessert: "Десерт",
  Snack: "Похапване",
  Vegetarian: "Вегетарианско",
  Vegan: "Веган",
  "Gluten-Free": "Без глутен",
  Keto: "Кето",
  Paleo: "Палео",
  Italian: "Италианско",
  Mexican: "Мексиканско",
  Asian: "Азиатско",
  Mediterranean: "Средиземноморско",
  American: "Американско",
  "Quick & Easy": "Бързо и лесно",
  Healthy: "Здравословно",
  "Comfort Food": "За душата",
  Spicy: "Люто",
};

/** Keys match `categoryKeywords` in convex/categories.ts, plus "Other". */
export const AISLE_LABELS: Record<string, string> = {
  Produce: "Плодове и зеленчуци",
  Dairy: "Млечни",
  "Meat & Seafood": "Месо и риба",
  "Grains & Pasta": "Зърнени и паста",
  "Canned & Jarred": "Консерви и буркани",
  "Baking & Spices": "Печене и подправки",
  Frozen: "Замразени",
  Beverages: "Напитки",
  Household: "Домакински",
  Other: "Други",
};

/** Meal types are stored lowercase on meal plans. */
export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Закуска",
  lunch: "Обяд",
  dinner: "Вечеря",
};

/** Meal plan days are stored as English weekday names. */
export const DAY_LABELS: Record<string, string> = {
  Monday: "Понеделник",
  Tuesday: "Вторник",
  Wednesday: "Сряда",
  Thursday: "Четвъртък",
  Friday: "Петък",
  Saturday: "Събота",
  Sunday: "Неделя",
};

function lookup(labels: Record<string, string>, value: string) {
  return Object.prototype.hasOwnProperty.call(labels, value) ? labels[value] : value;
}

export function difficultyLabel(value: string) {
  return lookup(DIFFICULTY_LABELS, value);
}

export function tagLabel(value: string) {
  return lookup(TAG_LABELS, value);
}

export function aisleLabel(value: string) {
  return lookup(AISLE_LABELS, value);
}

export function mealTypeLabel(value: string) {
  return lookup(MEAL_TYPE_LABELS, value.toLowerCase());
}

export function dayLabel(value: string) {
  return lookup(DAY_LABELS, value);
}
