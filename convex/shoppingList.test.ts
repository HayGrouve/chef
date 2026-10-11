/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { MAX_BATCH, MAX_ITEM_LENGTH, MAX_LIST_ITEMS } from "./shoppingList";

const modules = import.meta.glob("./**/*.ts");
const USER = { subject: "user_a", name: "A", tokenIdentifier: "test|user_a" };

test("items are trimmed and must be non-empty and reasonably short", async () => {
  const user = convexTest(schema, modules).withIdentity(USER);
  await expect(user.mutation(api.shoppingList.add, { ingredient: "   " })).rejects.toThrow();
  await expect(
    user.mutation(api.shoppingList.add, { ingredient: "x".repeat(MAX_ITEM_LENGTH + 1) })
  ).rejects.toThrow();
  await user.mutation(api.shoppingList.add, { ingredient: "  2 eggs  " });
  expect((await user.query(api.shoppingList.list, {})).map((i) => i.ingredient)).toEqual(["2 eggs"]);
});

test("batches and whole lists are capped so the list stays readable and clearable", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity(USER);
  await expect(
    user.mutation(api.shoppingList.addBatch, { ingredients: Array(MAX_BATCH + 1).fill("egg") })
  ).rejects.toThrow();

  await t.run(async (ctx) => {
    for (let i = 0; i < MAX_LIST_ITEMS; i++) {
      await ctx.db.insert("shoppingList", { userId: USER.subject, ingredient: "egg", isChecked: false });
    }
  });
  await expect(user.mutation(api.shoppingList.add, { ingredient: "milk" })).rejects.toThrow(/full/);
  await user.mutation(api.shoppingList.clearAll, {});
  expect(await user.query(api.shoppingList.list, {})).toHaveLength(0);
});

test("checking items sets their state, so repeated or stale requests don't undo each other", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity(USER);
  const ids = await user.mutation(api.shoppingList.addBatch, { ingredients: ["milk", "milk"] });

  await user.mutation(api.shoppingList.toggleBatch, { ids, isChecked: true });
  await user.mutation(api.shoppingList.toggleBatch, { ids, isChecked: true });
  let items = await user.query(api.shoppingList.list, {});
  expect(items.map((i) => i.isChecked)).toEqual([true, true]);

  await user.mutation(api.shoppingList.toggleBatch, { ids, isChecked: false });
  items = await user.query(api.shoppingList.list, {});
  expect(items.map((i) => i.isChecked)).toEqual([false, false]);

  // Older clients omit isChecked and get a flip
  await user.mutation(api.shoppingList.toggleBatch, { ids: [ids[0]] });
  items = await user.query(api.shoppingList.list, {});
  expect(items.map((i) => i.isChecked)).toEqual([true, false]);
});

test("undoing Organize brings back merged items only, not ones deleted afterwards", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity(USER);
  const [kept, merged, other] = await user.mutation(api.shoppingList.addBatch, {
    ingredients: ["1 egg", "2 eggs", "lemon"],
  });
  // What organize returns: "2 eggs" merged into "1 egg"; "lemon" kept
  const snapshot = [
    { id: kept, item: { ingredient: "1 egg", isChecked: false, mergedAway: false } },
    { id: merged, item: { ingredient: "2 eggs", isChecked: false, mergedAway: true } },
    { id: other, item: { ingredient: "lemon", isChecked: false, mergedAway: false, category: "x".repeat(500) } },
  ];
  await user.mutation(api.shoppingList.remove, { id: merged });
  await user.mutation(api.shoppingList.remove, { id: other }); // the user deletes "lemon" after organizing

  await user.mutation(api.ai.restoreShoppingListItems, { items: snapshot });
  const items = await user.query(api.shoppingList.list, {});
  expect(items.map((i) => i.ingredient).sort()).toEqual(["1 egg", "2 eggs"]);

  // Category sizes are capped like everywhere else
  await user.mutation(api.ai.restoreShoppingListItems, {
    items: [{ id: kept, item: { ingredient: "1 egg", isChecked: false, category: "y".repeat(500) } }],
  });
  const egg = (await user.query(api.shoppingList.list, {})).find((i) => i._id === kept);
  expect(egg?.category?.length).toBe(50);
});
