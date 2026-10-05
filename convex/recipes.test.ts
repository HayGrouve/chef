/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const HOST = { subject: "user_host", name: "Host", tokenIdentifier: "test|user_host" };
const GUEST = { subject: "user_guest", name: "Guest", tokenIdentifier: "test|user_guest" };

const baseRecipe = {
  title: "Pancakes",
  description: "Fluffy weekend pancakes",
  ingredients: ["2 eggs", "200g flour"],
  steps: ["Mix", "Cook"],
  storageId: "",
  isPublic: true,
};

function setup() {
  const t = convexTest(schema, modules);
  return { t, host: t.withIdentity(HOST), guest: t.withIdentity(GUEST) };
}

async function storeFile(t: ReturnType<typeof convexTest>) {
  return await t.run((ctx) => ctx.storage.store(new Blob(["img"], { type: "image/png" })));
}

// recipes.create schedules background AI tagging; keep it from running
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("favorites never expose recipes the caller can't read", () => {
  test("a favorited recipe that becomes private disappears from the favorites list", async () => {
    const { host, guest } = setup();
    const id = await host.mutation(api.recipes.create, baseRecipe);
    await guest.mutation(api.recipes.toggleFavorite, { id });

    await host.mutation(api.recipes.update, { id, ...baseRecipe, storageId: undefined, isPublic: false });

    const favorites = await guest.query(api.recipes.list, {
      favoritesOnly: true,
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(favorites.page).toHaveLength(0);
  });

  test("another user's private recipe can't be favorited", async () => {
    const { host, guest } = setup();
    const id = await host.mutation(api.recipes.create, { ...baseRecipe, isPublic: false });
    await expect(guest.mutation(api.recipes.toggleFavorite, { id })).rejects.toThrow();
  });

  test("an existing favorite can still be removed after the recipe goes private", async () => {
    const { t, host, guest } = setup();
    const id = await host.mutation(api.recipes.create, baseRecipe);
    await guest.mutation(api.recipes.toggleFavorite, { id });
    await host.mutation(api.recipes.update, { id, ...baseRecipe, storageId: undefined, isPublic: false });

    await guest.mutation(api.recipes.toggleFavorite, { id });
    const rows = await t.run((ctx) => ctx.db.query("favorites").collect());
    expect(rows).toHaveLength(0);
  });
});

describe("recipe images belong to one recipe", () => {
  test("can't create a recipe with another recipe's image", async () => {
    const { t, host, guest } = setup();
    const storageId = await storeFile(t);
    await host.mutation(api.recipes.create, { ...baseRecipe, storageId });

    await expect(
      guest.mutation(api.recipes.create, { ...baseRecipe, storageId })
    ).rejects.toThrow();
  });

  test("can't point an existing recipe at another recipe's image", async () => {
    const { t, host, guest } = setup();
    const storageId = await storeFile(t);
    await host.mutation(api.recipes.create, { ...baseRecipe, storageId });
    const mine = await guest.mutation(api.recipes.create, baseRecipe);

    await expect(
      guest.mutation(api.recipes.update, { id: mine, ...baseRecipe, storageId })
    ).rejects.toThrow();
  });

  test("deleting your recipe never deletes someone else's image", async () => {
    const { t, host, guest } = setup();
    const storageId = await storeFile(t);
    const hostRecipe = await host.mutation(api.recipes.create, { ...baseRecipe, storageId });
    // Simulate a row that already shares the image (e.g. created before the check existed)
    const guestRecipe = await t.run((ctx) =>
      ctx.db.insert("recipes", { ...baseRecipe, storageId, userId: GUEST.subject })
    );

    await guest.mutation(api.recipes.remove, { id: guestRecipe });

    const recipe = await host.query(api.recipes.get, { id: hostRecipe });
    expect(recipe?.imageUrl).not.toBeNull();
  });

  test("replacing an image deletes the old file", async () => {
    const { t, host } = setup();
    const oldImage = await storeFile(t);
    const newImage = await storeFile(t);
    const id = await host.mutation(api.recipes.create, { ...baseRecipe, storageId: oldImage });

    await host.mutation(api.recipes.update, { id, ...baseRecipe, storageId: newImage });

    const oldFileExists = await t.run(async (ctx) => (await ctx.storage.get(oldImage)) !== null);
    expect(oldFileExists).toBe(false);
  });
});

describe("deleting a recipe cleans up references to it", () => {
  test("favorites, meal plans and shopping-list links are removed", async () => {
    const { t, host, guest } = setup();
    const id = await host.mutation(api.recipes.create, baseRecipe);
    await guest.mutation(api.recipes.toggleFavorite, { id });
    await guest.mutation(api.mealPlans.add, { date: "Monday", mealType: "dinner", recipeId: id });
    await guest.mutation(api.shoppingList.addBatch, { ingredients: ["2 eggs"], recipeId: id });

    await host.mutation(api.recipes.remove, { id });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const state = await t.run(async (ctx) => ({
      favorites: await ctx.db.query("favorites").collect(),
      plans: await ctx.db.query("mealPlans").collect(),
      items: await ctx.db.query("shoppingList").collect(),
    }));
    expect(state.favorites).toHaveLength(0);
    expect(state.plans).toHaveLength(0);
    // The ingredient stays on the list; it just no longer links to the recipe
    expect(state.items).toHaveLength(1);
    expect(state.items[0].recipeId).toBeUndefined();
  });
});

describe("deleting a heavily referenced recipe", () => {
  test("cleanup is batched, so many references can't block the delete", async () => {
    const { t, host } = setup();
    const id = await host.mutation(api.recipes.create, baseRecipe);
    // More rows than one cleanup batch, spread over several users
    await t.run(async (ctx) => {
      for (let i = 0; i < 450; i++) {
        await ctx.db.insert("shoppingList", {
          userId: `user_${i % 5}`, ingredient: "egg", isChecked: false, recipeId: id,
        });
      }
    });

    await host.mutation(api.recipes.remove, { id });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const linked = await t.run(async (ctx) =>
      (await ctx.db.query("shoppingList").collect()).filter((i) => i.recipeId !== undefined)
    );
    expect(linked).toHaveLength(0);
  });
});

describe("recipe lookups by URL id", () => {
  test("malformed or foreign-table ids read as not found instead of throwing", async () => {
    const { t, host } = setup();
    const userRow = await t.run((ctx) =>
      ctx.db.insert("users", { name: "x", tokenIdentifier: "x" })
    );
    for (const id of ["abc", "", userRow]) {
      expect(await host.query(api.recipes.get, { id })).toBeNull();
      expect(await host.query(api.recipes.getPublic, { id })).toBeNull();
    }
  });
});

describe("signed-out visitors", () => {
  test("favorites and my-recipes filters return nothing instead of every public recipe", async () => {
    const { t, host } = setup();
    await host.mutation(api.recipes.create, baseRecipe);
    const paginationOpts = { numItems: 20, cursor: null };
    const favorites = await t.query(api.recipes.list, { favoritesOnly: true, paginationOpts });
    const mine = await t.query(api.recipes.list, { myRecipesOnly: true, paginationOpts });
    expect(favorites.page).toHaveLength(0);
    expect(mine.page).toHaveLength(0);
    // The unfiltered list still shows public recipes
    expect((await t.query(api.recipes.list, { paginationOpts })).page).toHaveLength(1);
  });
});

describe("shopping list links", () => {
  test("items can't be linked to a recipe the user can't read", async () => {
    const { t, host, guest } = setup();
    const secret = await host.mutation(api.recipes.create, { ...baseRecipe, isPublic: false });
    await guest.mutation(api.shoppingList.add, { ingredient: "salt", recipeId: secret });
    await guest.mutation(api.shoppingList.addBatch, { ingredients: ["pepper"], recipeId: secret });
    const items = await t.run((ctx) => ctx.db.query("shoppingList").collect());
    expect(items.map((i) => i.recipeId)).toEqual([undefined, undefined]);
  });
});
