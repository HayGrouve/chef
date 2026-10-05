import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canReadRecipe } from "./access";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"];
// Several meals per slot are fine, but keep the week bounded
const MAX_PLANNED_MEALS = 100;

/** Rejects slots the planner can't show; stored meal types are lowercase. */
export function validSlot(date: string, mealType: string) {
  const type = mealType.toLowerCase();
  if (!DAYS.includes(date) || !MEAL_TYPES.includes(type)) {
    throw new Error("Invalid meal slot");
  }
  return { date, mealType: type };
}

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
        if (!canReadRecipe(recipe, identity.subject)) {
          return { ...meal, recipeTitle: undefined, recipeImage: null };
        }
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
    const slot = validSlot(args.date, args.mealType);
    const planned = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) => q.eq("userId", identity.subject))
      .take(MAX_PLANNED_MEALS);
    if (planned.length >= MAX_PLANNED_MEALS) {
      throw new Error("Your week is full. Remove some meals first.");
    }
    const recipe = await ctx.db.get(args.recipeId);
    if (!canReadRecipe(recipe, identity.subject)) {
      throw new Error("Recipe not found");
    }
    return await ctx.db.insert("mealPlans", {
      userId: identity.subject,
      ...slot,
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

    await ctx.db.patch(args.id, validSlot(args.date, args.mealType));
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
      .filter((q) =>
        q.or(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("isPublic"), true)
        )
      )
      .collect();

    if (recipes.length === 0) {
      return {
        count: 0,
        message: "No recipes found. Create one or wait for public recipes!",
      };
    }

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

    if (newPlans.length === 0) {
      return { count: 0, message: "Your week is already fully planned!" };
    }

    await Promise.all(newPlans.map((plan) => ctx.db.insert("mealPlans", plan)));

    return {
      count: newPlans.length,
      message: `Generated ${newPlans.length} meals!`,
    };
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
