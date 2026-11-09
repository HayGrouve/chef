/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ANONYMOUS_CHEF } from "./migrations";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

type T = ReturnType<typeof convexTest>;

/** A small production: 2 owners (2 recipes and 1), 2 people without recipes, everything else per person. */
async function seed(t: T) {
  return await t.run(async (ctx) => {
    const store = () => ctx.storage.store(new Blob(["img"], { type: "image/png" }));
    const people = [
      { userId: "user_ana", name: "Ана Петрова", email: "ana@example.com", bio: "Пека хляб.", avatarUrl: "https://img.clerk.com/ana" },
      { userId: "user_bob", name: "Боб", email: "bob@example.com", avatarUrl: "https://img.clerk.com/bob" },
      { userId: "user_cvet", name: "Цвети", email: "cvet@example.com" },
      { userId: "user_dim", name: "Дими" },
    ];
    for (const person of people) {
      await ctx.db.insert("users", { ...person, tokenIdentifier: `https://good-puma-58.clerk.accounts.dev|${person.userId}` });
    }
    const photos: Id<"_storage">[] = [];
    const recipeIds: Id<"recipes">[] = [];
    for (const [userId, name, title] of [
      ["user_ana", "Ана Петрова", "Баница"],
      ["user_ana", "Ана Петрова", "Таратор"],
      ["user_bob", "Боб", "Мусака"],
    ]) {
      const photo = await store();
      photos.push(photo);
      recipeIds.push(
        await ctx.db.insert("recipes", {
          userId,
          title,
          description: "",
          ingredients: ["сирене"],
          steps: ["Изпечи"],
          storageId: photo,
          isPublic: true,
          authorName: name,
          searchText: `${title} ${name}`.toLowerCase(),
        })
      );
    }
    const strayFile = await store();
    for (const userId of ["user_ana", "user_cvet", "user_dim"]) {
      await ctx.db.insert("favorites", { userId, recipeId: recipeIds[2] });
      await ctx.db.insert("shoppingList", { userId, ingredient: "сирене", isChecked: false, recipeId: recipeIds[0] });
      await ctx.db.insert("mealPlans", { userId, date: "Monday", mealType: "dinner", recipeId: recipeIds[1] });
      await ctx.db.insert("rateLimits", { userId, action: "aiCalls", lastCalledAt: Date.now(), count: 1 });
    }
    return { photos, recipeIds, strayFile };
  });
}

async function snapshot(t: T) {
  return await t.run(async (ctx) => ({
    users: await ctx.db.query("users").collect(),
    recipes: await ctx.db.query("recipes").collect(),
    favorites: await ctx.db.query("favorites").collect(),
    shoppingList: await ctx.db.query("shoppingList").collect(),
    mealPlans: await ctx.db.query("mealPlans").collect(),
    rateLimits: await ctx.db.query("rateLimits").collect(),
    files: (await ctx.db.system.query("_storage").collect()).map((file) => file._id),
  }));
}

const expectedCounts = {
  users: { keep: 2, drop: 2 },
  recipes: { keep: 3, drop: 0 },
  favorites: { keep: 0, drop: 3 },
  shoppingList: { keep: 0, drop: 3 },
  mealPlans: { keep: 0, drop: 3 },
  rateLimits: { keep: 0, drop: 3 },
  _storage: { keep: 3, drop: 1 },
};

test("a dry run returns the counts per table and writes nothing", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const before = await snapshot(t);

  const result = await t.mutation(internal.migrations.cutoverWipe, { dryRun: true });

  expect(result.tables).toEqual(expectedCounts);
  expect(result).toMatchObject({ dryRun: true, owners: 2, createdOwners: 0, renamedRecipes: 3 });
  expect(await snapshot(t)).toEqual(before);
});

test("the wipe keeps every recipe under anonymous chefs and drops everything else", async () => {
  const t = convexTest(schema, modules);
  const { photos, recipeIds, strayFile } = await seed(t);

  const result = await t.mutation(internal.migrations.cutoverWipe, { dryRun: false });
  expect(result.tables).toEqual(expectedCounts);

  const after = await snapshot(t);
  // The two owners stay, anonymised and unclaimable; the old Clerk id stays
  expect(after.users).toEqual([
    { _id: expect.anything(), _creationTime: expect.any(Number), userId: "user_ana", name: ANONYMOUS_CHEF, tokenIdentifier: "anonymous|1" },
    { _id: expect.anything(), _creationTime: expect.any(Number), userId: "user_bob", name: ANONYMOUS_CHEF, tokenIdentifier: "anonymous|2" },
  ]);
  // Every recipe stays, with its photo, credited to the anonymous chef
  expect(after.recipes.map((recipe) => recipe._id)).toEqual(recipeIds);
  for (const recipe of after.recipes) {
    expect(recipe.authorName).toBe(ANONYMOUS_CHEF);
    expect(recipe.searchText).toBe(`${recipe.title} ${ANONYMOUS_CHEF}`.toLowerCase());
  }
  expect(JSON.stringify(after.recipes)).not.toMatch(/Ана|Боб/);
  expect(after.files.sort()).toEqual([...photos].sort());
  expect(after.files).not.toContain(strayFile);
  for (const table of ["favorites", "shoppingList", "mealPlans", "rateLimits"] as const) {
    expect(after[table]).toEqual([]);
  }

  // The anonymous chef's public profile and recipes still render
  const profile = await t.query(api.users.get, { userId: "user_ana" });
  expect(profile?.name).toBe(ANONYMOUS_CHEF);
  expect(profile?.bio ?? null).toBeNull();
  expect(profile?.avatarUrl ?? null).toBeNull();
  const recipe = await t.query(api.recipes.getPublic, { id: recipeIds[0] });
  expect(recipe?.authorName).toBe(ANONYMOUS_CHEF);

  // Running it again finds nothing more to drop
  const again = await t.mutation(internal.migrations.cutoverWipe, { dryRun: true });
  expect(again.tables.users).toEqual({ keep: 2, drop: 0 });
  expect(again.renamedRecipes).toBe(0);
});

test("a queued rename can't write a real name back after the wipe", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  await t.run((ctx) =>
    ctx.scheduler.runAfter(1000, internal.recipes.refreshAuthorName, { userId: "user_ana", name: "Ана Петрова" })
  );

  const result = await t.mutation(internal.migrations.cutoverWipe, { dryRun: false });
  expect(result.cancelledRenames).toBe(1);
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const recipes = await t.run((ctx) => ctx.db.query("recipes").collect());
  expect(recipes.every((recipe) => recipe.authorName === ANONYMOUS_CHEF)).toBe(true);
});

test("an owner without a profile row gets an anonymous one", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("recipes", { userId: "user_gone", title: "Супа", description: "", ingredients: [], steps: [], storageId: "", isPublic: true, authorName: "Стар" })
  );
  const result = await t.mutation(internal.migrations.cutoverWipe, { dryRun: false });
  expect(result.createdOwners).toBe(1);
  expect(await t.query(api.users.get, { userId: "user_gone" })).toMatchObject({ name: ANONYMOUS_CHEF });
});

test("no file is deleted while a recipe has a storage id that can't be matched", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.storage.store(new Blob(["img"], { type: "image/png" }));
    await ctx.db.insert("recipes", { userId: "user_a", title: "Стара", description: "", ingredients: [], steps: [], storageId: "legacy-uuid-1234" });
  });
  const result = await t.mutation(internal.migrations.cutoverWipe, { dryRun: false });
  expect(result.unrecognisedStorageIds).toBe(1);
  expect(result.tables._storage).toEqual({ keep: 1, drop: 0 });
});
