/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const USER = { subject: "user_a", name: "A", tokenIdentifier: "test|user_a" };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function setup() {
  const t = convexTest(schema, modules);
  const user = t.withIdentity(USER);
  const recipeId = await user.mutation(api.recipes.create, {
    title: "Soup",
    description: "Warm soup",
    ingredients: ["water"],
    steps: ["Boil"],
    storageId: "",
  });
  return { t, user, recipeId };
}

test("meals can only be planned into slots the planner shows", async () => {
  const { user, recipeId } = await setup();
  await expect(
    user.mutation(api.mealPlans.add, { date: "Funday", mealType: "dinner", recipeId })
  ).rejects.toThrow("Invalid meal slot");
  await expect(
    user.mutation(api.mealPlans.add, { date: "Monday", mealType: "brunch", recipeId })
  ).rejects.toThrow("Invalid meal slot");

  const id = await user.mutation(api.mealPlans.add, { date: "Monday", mealType: "Dinner", recipeId });
  await expect(
    user.mutation(api.mealPlans.move, { id, date: "2026-01-01", mealType: "dinner" })
  ).rejects.toThrow("Invalid meal slot");

  const week = await user.query(api.mealPlans.getWeek, {});
  expect(week.map((m) => [m.date, m.mealType])).toEqual([["Monday", "dinner"]]);
});
