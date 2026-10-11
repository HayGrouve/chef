/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import { api, internal } from "./_generated/api";
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

test("Shop week adds every planned meal's ingredients, beyond one client batch", async () => {
  const { t, user, recipeId } = await setup();
  expect(await user.mutation(api.shoppingList.addPlannedWeek, {})).toEqual([]);

  const other = t.withIdentity({ subject: "user_b", name: "B", tokenIdentifier: "test|user_b" });
  const big = await other.mutation(api.recipes.create, {
    title: "Feast",
    description: "",
    ingredients: Array.from({ length: 60 }, (_, i) => `item ${i}`),
    steps: ["Cook"],
    storageId: "",
    isPublic: true,
  });
  for (const date of ["Monday", "Tuesday", "Wednesday", "Thursday"]) {
    await user.mutation(api.mealPlans.add, { date, mealType: "dinner", recipeId: big });
  }
  await user.mutation(api.mealPlans.add, { date: "Friday", mealType: "lunch", recipeId });
  const ids = await user.mutation(api.shoppingList.addPlannedWeek, {});
  expect(ids).toHaveLength(4 * 60 + 1);

  // Once private, another user's recipe is no longer shopped for
  await other.mutation(api.recipes.update, {
    id: big,
    title: "Feast",
    description: "",
    ingredients: ["secret"],
    steps: ["Cook"],
    isPublic: false,
  });
  await user.mutation(api.shoppingList.clearAll, {});
  const after = await user.mutation(api.shoppingList.addPlannedWeek, {});
  expect(after).toHaveLength(1);
  const items = await user.query(api.shoppingList.list, {});
  expect(items.map((i) => i.ingredient)).toEqual(["water"]);
});

test("auto-fill and AI suggestions respect the meal cap and never double-book a slot", async () => {
  const { t, user, recipeId } = await setup();
  // 99 meals, all in Monday dinner, leaves 20 empty slots but room for 1
  await t.run(async (ctx) => {
    for (let i = 0; i < 99; i++) {
      await ctx.db.insert("mealPlans", { userId: USER.subject, date: "Monday", mealType: "dinner", recipeId });
    }
  });
  const result = await user.mutation(api.mealPlans.autoGenerate, {});
  expect(result.count).toBe(1);
  const full = await user.mutation(api.mealPlans.autoGenerate, {});
  expect(full.count).toBe(0);

  const t2 = (await setup());
  const inserted = await t2.t.mutation(internal.ai.insertGeneratedMeals, {
    userId: USER.subject,
    newMeals: [
      { date: "Tuesday", mealType: "lunch", recipeId: t2.recipeId },
      { date: "Tuesday", mealType: "lunch", recipeId: t2.recipeId },
      { date: "Wednesday", mealType: "dinner", recipeId: t2.recipeId },
    ],
  });
  expect(inserted).toBe(2);
});
