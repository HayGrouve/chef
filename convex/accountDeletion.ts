// Erasing what Кухнята holds about one person: "Изтрий данните" on
// /profile/edit#danni, and Clerk's `user.deleted` webhook (only the hub's
// /akaunt deletes the Акаунт itself). One batched routine serves both.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canReadRecipe } from "./access";
import { requireUserId } from "./lib/auth";
import { deleteImageIfUnused } from "./recipes";

// Small batches: a maximum-size recipe is ~250 KB
const RECIPE_BATCH = 10;
const ROW_BATCH = 200;

/**
 * Erases one person: their recipes a batch at a time (each with its photo,
 * and other people's favourites and plans of it), then their favourites,
 * shopping list, meal plans and, unless `keepRateLimits`, their rate-limit
 * counters, and finally their `users` row. Reschedules itself until done.
 * Stray files are swept by the daily `storageCleanup.deleteOrphanUploads`.
 */
export const deleteUserData = internalMutation({
  args: { userId: v.string(), keepRateLimits: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, keepRateLimits }) => {
    const again = () =>
      ctx.scheduler.runAfter(0, internal.accountDeletion.deleteUserData, { userId, keepRateLimits });

    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(RECIPE_BATCH);
    if (recipes.length > 0) {
      for (const recipe of recipes) {
        // Same steps as recipes.remove: a public recipe vanishes for everyone
        await ctx.scheduler.runAfter(0, internal.recipes.cleanupReferences, { recipeId: recipe._id });
        await deleteImageIfUnused(ctx, recipe.storageId, recipe._id);
        await ctx.db.delete(recipe._id);
      }
      await again();
      return null;
    }

    const batches = await Promise.all([
      ctx.db.query("favorites").withIndex("by_user", (q) => q.eq("userId", userId)).take(ROW_BATCH),
      ctx.db.query("shoppingList").withIndex("by_user", (q) => q.eq("userId", userId)).take(ROW_BATCH),
      ctx.db.query("mealPlans").withIndex("by_user_date", (q) => q.eq("userId", userId)).take(ROW_BATCH),
      keepRateLimits
        ? Promise.resolve([])
        : ctx.db.query("rateLimits").withIndex("by_user_action", (q) => q.eq("userId", userId)).take(ROW_BATCH),
    ]);
    for (const rows of batches) {
      for (const row of rows) await ctx.db.delete(row._id);
    }
    if (batches.some((rows) => rows.length === ROW_BATCH)) {
      await again();
      return null;
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const user of users) await ctx.db.delete(user._id);
    return null;
  },
});

/**
 * "Изтрий данните": wipes what Кухнята holds about you; you stay signed in
 * and `UserSync` starts you a fresh profile. Rate-limit counters are kept, so
 * wiping never resets the AI quotas. The typed ИЗТРИЙ check is client side.
 */
export const deleteMyData = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await ctx.scheduler.runAfter(0, internal.accountDeletion.deleteUserData, {
      userId,
      keepRateLimits: true,
    });
    return null;
  },
});

/**
 * Clerk deleted the Акаунт (verified `user.deleted` webhook). Records the
 * delivery once and starts erasing everything, rate-limit counters included.
 * Returns false for a repeated delivery. Chef's `userId` is the Clerk user id.
 */
export const recordUserDeleted = internalMutation({
  args: { eventId: v.string(), userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("processedWebhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (seen) return false;

    await ctx.db.insert("processedWebhookEvents", {
      eventId: args.eventId,
      processedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.accountDeletion.deleteUserData, {
      userId: args.userId,
      keepRateLimits: false,
    });
    return true;
  },
});

/**
 * "Изтегли данните си": your recipes (with photo links), favourites,
 * shopping list and meal plans, for the client to save as JSON.
 */
export const exportMyData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const [recipes, favorites, shoppingList, mealPlans] = await Promise.all([
      ctx.db.query("recipes").withIndex("by_userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("favorites").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("shoppingList").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("mealPlans").withIndex("by_user_date", (q) => q.eq("userId", userId)).collect(),
    ]);

    // Titles for recipes you saved or planned: yours, or others' while public
    const titles = new Map<string, string | null>(recipes.map((recipe) => [recipe._id, recipe.title]));
    const titleOf = async (recipeId: Id<"recipes">) => {
      if (!titles.has(recipeId)) {
        const recipe = await ctx.db.get(recipeId);
        titles.set(recipeId, canReadRecipe(recipe, userId) ? recipe.title : null);
      }
      return titles.get(recipeId) ?? null;
    };

    return {
      exportedAt: new Date().toISOString(),
      recipes: await Promise.all(
        recipes.map(async (recipe) => ({
          id: recipe._id,
          createdAt: new Date(recipe._creationTime).toISOString(),
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          format: recipe.format ?? null,
          tags: recipe.tags ?? [],
          isPublic: recipe.isPublic ?? false,
          cookingTime: recipe.cookingTime ?? null,
          difficulty: recipe.difficulty ?? null,
          calories: recipe.calories ?? null,
          imageUrl: recipe.storageId ? await ctx.storage.getUrl(recipe.storageId) : null,
        }))
      ),
      favorites: await Promise.all(
        favorites.map(async (favorite) => ({
          recipeId: favorite.recipeId,
          title: await titleOf(favorite.recipeId),
        }))
      ),
      shoppingList: shoppingList.map((item) => ({
        ingredient: item.ingredient,
        isChecked: item.isChecked,
        category: item.category ?? null,
        recipeId: item.recipeId ?? null,
      })),
      mealPlans: await Promise.all(
        mealPlans.map(async (plan) => ({
          date: plan.date,
          mealType: plan.mealType,
          recipeId: plan.recipeId,
          title: await titleOf(plan.recipeId),
        }))
      ),
    };
  },
});
