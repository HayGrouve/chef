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
