import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get the static weekly plan
export const getWeek = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Fetch all meal plans for the user
    // We treat 'date' as the day name (e.g., "Monday")
    const meals = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) => q.eq("userId", identity.subject))
      .collect();

    // Join with recipe details
    return await Promise.all(
      meals.map(async (meal) => {
        const recipe = await ctx.db.get(meal.recipeId);
        return {
          ...meal,
          recipeTitle: recipe?.title,
          recipeImage: recipe?.storageId
            ? await ctx.storage.getUrl(recipe.storageId)
            : null,
        };
      })
    );
  },
});

// Add a meal plan (date is now "Monday", "Tuesday", etc.)
export const add = mutation({
  args: {
    date: v.string(), // Day of week
    mealType: v.string(),
    recipeId: v.id("recipes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    return await ctx.db.insert("mealPlans", {
      userId: identity.subject,
      date: args.date,
      mealType: args.mealType,
      recipeId: args.recipeId,
    });
  },
});

// Move a meal plan
export const move = mutation({
  args: {
    id: v.id("mealPlans"),
    date: v.string(), // Day of week
    mealType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const meal = await ctx.db.get(args.id);
    if (!meal || meal.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      date: args.date,
      mealType: args.mealType,
    });
  },
});

// Auto-generate for empty slots in the static week
export const autoGenerate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const recipes = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    if (recipes.length === 0) return;

    const existingPlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) => q.eq("userId", identity.subject))
      .collect();

    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const mealTypes = ["breakfast", "lunch", "dinner"];
    const newPlans = [];

    for (const day of days) {
      for (const type of mealTypes) {
        const hasPlan = existingPlans.some(
          (p) => p.date === day && p.mealType === type
        );
        if (!hasPlan) {
          // Filter recipes by tag
          const taggedRecipes = recipes.filter((recipe) =>
            recipe.tags?.some((tag) => tag.toLowerCase() === type.toLowerCase())
          );

          // Use tagged recipes if available, otherwise fallback to all recipes
          const candidates = taggedRecipes.length > 0 ? taggedRecipes : recipes;

          const randomRecipe =
            candidates[Math.floor(Math.random() * candidates.length)];

          newPlans.push({
            userId: identity.subject,
            date: day,
            mealType: type,
            recipeId: randomRecipe._id,
          });
        }
      }
    }

    await Promise.all(newPlans.map((plan) => ctx.db.insert("mealPlans", plan)));
  },
});

export const remove = mutation({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const meal = await ctx.db.get(args.id);
    if (!meal || meal.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

export const clearAll = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const meals = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) => q.eq("userId", identity.subject))
      .collect();

    await Promise.all(meals.map((meal) => ctx.db.delete(meal._id)));
  },
});
