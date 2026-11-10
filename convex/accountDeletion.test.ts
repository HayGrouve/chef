/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const ME = { subject: "user_me", name: "Мария", tokenIdentifier: "test|user_me" };
const OTHER = { subject: "user_other", name: "Иван", tokenIdentifier: "test|user_other" };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

type T = ReturnType<typeof convexTest>;

/** One person with everything Кухнята stores: profile, recipes with photos, favourites, list, plans, counters. */
async function seedPerson(t: T, userId: string, name: string, recipeCount: number) {
  return await t.run(async (ctx) => {
    await ctx.db.insert("users", { name, tokenIdentifier: `test|${userId}`, userId, bio: "Готвя." });
    const recipeIds: Id<"recipes">[] = [];
    const fileIds: Id<"_storage">[] = [];
    for (let i = 0; i < recipeCount; i++) {
      const fileId = await ctx.storage.store(new Blob([`img ${userId} ${i}`], { type: "image/png" }));
      fileIds.push(fileId);
      recipeIds.push(
        await ctx.db.insert("recipes", {
          userId,
          title: `Рецепта ${i}`,
          description: "",
          ingredients: ["вода"],
          steps: ["Свари"],
          storageId: fileId,
          isPublic: true,
          authorName: name,
        })
      );
    }
    await ctx.db.insert("favorites", { userId, recipeId: recipeIds[0] });
    await ctx.db.insert("shoppingList", { userId, ingredient: "2 лимона", isChecked: false, recipeId: recipeIds[0] });
    await ctx.db.insert("mealPlans", { userId, date: "Monday", mealType: "dinner", recipeId: recipeIds[0] });
    await ctx.db.insert("rateLimits", { userId, action: "aiCalls", lastCalledAt: Date.now(), count: 3 });
    return { recipeIds, fileIds };
  });
}

/** Rows per table that belong to `userId`, plus how many files are stored at all. */
async function countFor(t: T, userId: string) {
  return await t.run(async (ctx) => {
    const mine = async (table: "users" | "recipes" | "favorites" | "shoppingList" | "mealPlans" | "rateLimits") =>
      (await ctx.db.query(table).collect()).filter((row) => row.userId === userId).length;
    return {
      users: await mine("users"),
      recipes: await mine("recipes"),
      favorites: await mine("favorites"),
      shoppingList: await mine("shoppingList"),
      mealPlans: await mine("mealPlans"),
      rateLimits: await mine("rateLimits"),
    };
  });
}

async function setup() {
  const t = convexTest(schema, modules);
  // More recipes than one batch, so the routine has to reschedule itself
  const me = await seedPerson(t, ME.subject, ME.name, 12);
  const other = await seedPerson(t, OTHER.subject, OTHER.name, 1);
  // The other person saved, planned and listed one of my public recipes
  await t.run(async (ctx) => {
    await ctx.db.insert("favorites", { userId: OTHER.subject, recipeId: me.recipeIds[3] });
    await ctx.db.insert("mealPlans", { userId: OTHER.subject, date: "Friday", mealType: "lunch", recipeId: me.recipeIds[3] });
    await ctx.db.insert("shoppingList", { userId: OTHER.subject, ingredient: "1 краставица", isChecked: false, recipeId: me.recipeIds[3] });
  });
  return { t, me, other };
}

const otherBefore = { users: 1, recipes: 1, favorites: 2, shoppingList: 2, mealPlans: 2, rateLimits: 1 };

test("Изтрий данните empties every table for you but keeps your rate-limit counters", async () => {
  const { t, me, other } = await setup();

  await t.withIdentity(ME).mutation(api.accountDeletion.deleteMyData, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect(await countFor(t, ME.subject)).toEqual({
    users: 0,
    recipes: 0,
    favorites: 0,
    shoppingList: 0,
    mealPlans: 0,
    rateLimits: 1,
  });

  // Photos of my recipes are deleted; the other person's photo stays
  const files = await t.run(async (ctx) => (await ctx.db.system.query("_storage").collect()).map((f) => f._id));
  expect(files).toEqual(other.fileIds);
  expect(files).not.toContain(me.fileIds[0]);

  // My public recipe vanished for them too: their favourite and plan of it are
  // gone, their list item stays but loses the link. The rest of theirs is untouched.
  expect(await countFor(t, OTHER.subject)).toEqual({ ...otherBefore, favorites: 1, mealPlans: 1 });
  const theirItems = await t.run((ctx) =>
    ctx.db.query("shoppingList").withIndex("by_user", (q) => q.eq("userId", OTHER.subject)).collect()
  );
  expect(theirItems.map((item) => item.recipeId)).toEqual([other.recipeIds[0], undefined]);
});

test("after Изтрий данните you stay signed in and start with an empty profile", async () => {
  const { t } = await setup();
  const me = t.withIdentity(ME);
  await me.mutation(api.accountDeletion.deleteMyData, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await me.query(api.users.getMe, {})).toBeNull();

  await me.mutation(api.users.store, {});
  const profile = await me.query(api.users.getMe, {});
  expect(profile?.name).toBe("Мария");
  expect(profile?.bio).toBeUndefined();
});

test("Изтрий данните needs you signed in", async () => {
  const { t } = await setup();
  await expect(t.mutation(api.accountDeletion.deleteMyData, {})).rejects.toThrow();
});

test("user.deleted erases everything, rate-limit counters included", async () => {
  const { t } = await setup();

  expect(await t.mutation(internal.accountDeletion.recordUserDeleted, { eventId: "msg_1", userId: ME.subject })).toBe(true);
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect(await countFor(t, ME.subject)).toEqual({
    users: 0,
    recipes: 0,
    favorites: 0,
    shoppingList: 0,
    mealPlans: 0,
    rateLimits: 0,
  });
  expect(await countFor(t, OTHER.subject)).toEqual({ ...otherBefore, favorites: 1, mealPlans: 1 });
});

test("a repeated user.deleted delivery is ignored", async () => {
  const { t } = await setup();
  expect(await t.mutation(internal.accountDeletion.recordUserDeleted, { eventId: "msg_1", userId: ME.subject })).toBe(true);
  expect(await t.mutation(internal.accountDeletion.recordUserDeleted, { eventId: "msg_1", userId: ME.subject })).toBe(false);
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled).toHaveLength(1);
});

test("the export holds your recipes with photo links, favourites, list and plans", async () => {
  const { t, me } = await setup();
  const data = await t.withIdentity(ME).query(api.accountDeletion.exportMyData, {});

  expect(data.recipes).toHaveLength(12);
  expect(data.recipes[0].title).toBe("Рецепта 0");
  expect(data.recipes[0].imageUrl).toMatch(/^https?:\/\//);
  expect(data.favorites).toEqual([{ recipeId: me.recipeIds[0], title: "Рецепта 0" }]);
  expect(data.shoppingList).toEqual([
    { ingredient: "2 лимона", isChecked: false, category: null, recipeId: me.recipeIds[0] },
  ]);
  expect(data.mealPlans).toEqual([
    { date: "Monday", mealType: "dinner", recipeId: me.recipeIds[0], title: "Рецепта 0" },
  ]);
  await expect(t.query(api.accountDeletion.exportMyData, {})).rejects.toThrow();
});

test("the export names someone else's saved recipe only while you can read it", async () => {
  const { t, other } = await setup();
  await t.run(async (ctx) => {
    await ctx.db.insert("favorites", { userId: ME.subject, recipeId: other.recipeIds[0] });
    await ctx.db.patch(other.recipeIds[0], { isPublic: false });
  });
  const data = await t.withIdentity(ME).query(api.accountDeletion.exportMyData, {});
  expect(data.favorites.find((f) => f.recipeId === other.recipeIds[0])?.title).toBeNull();
});
