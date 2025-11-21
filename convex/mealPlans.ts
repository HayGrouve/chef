import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get meal plans for a date range
export const getWeek = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const meals = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", identity.subject)
          .gte("date", args.startDate)
          .lte("date", args.endDate)
      )
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

// Add a meal plan
export const add = mutation({
  args: {
    date: v.string(),
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

// Move a meal plan to a new date/type
export const move = mutation({
  args: {
    id: v.id("mealPlans"),
    date: v.string(),
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

    // Check if there's already a meal in the target slot?
    // For simplicity, we allow multiple meals per slot or just overwrite.
    // Let's just move it.
    await ctx.db.patch(args.id, {
      date: args.date,
      mealType: args.mealType,
    });
  },
});
// Auto-generate meal plan for empty slots
export const autoGenerate = mutation({
  args: { startDate: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // 1. Get recipes (prefer favorites, but fallback to any)
    // Note: We cannot filter by "isFavorite" directly because it's not in the recipe schema.
    // It's a computed property or stored in a separate table.
    // For now, we will just fetch user's recipes.
    // If we want to prioritize favorites, we'd need to query the favorites table first.
    let recipes = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    // Filter for favorites in memory if needed, or just proceed with all recipes
    // For this implementation, we'll use all user recipes to ensure we have enough variety
    // or we could fetch favorites separately. Let's stick to all user recipes for simplicity
    // as the "isFavorite" field doesn't exist on the recipe document.


    if (recipes.length === 0) return;

    // 2. Compute local week dates based on the provided startDate (yyyy-MM-dd)
    const [yearStr, monthStr, dayStr] = args.startDate.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    // Construct a local Date from the explicit year/month/day to avoid timezone shifts
    const localStart = new Date(year, month - 1, day);

    // Simple approach: Generate next 7 days from startDate, formatting as yyyy-MM-dd
    const dates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(localStart);
      d.setDate(d.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      return `${yyyy}-${mm}-${dd}`;
    });

    const existingPlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", identity.subject)
          .gte("date", dates[0])
          .lte("date", dates[6])
      )
      .collect();

    const mealTypes = ["breakfast", "lunch", "dinner"];

    const newPlans = [];

    for (const date of dates) {
      for (const type of mealTypes) {
        const hasPlan = existingPlans.some(
          (p) => p.date === date && p.mealType === type
        );
        if (!hasPlan) {
          // Pick a random recipe
          const randomRecipe =
            recipes[Math.floor(Math.random() * recipes.length)];
          newPlans.push({
            userId: identity.subject,
            date,
            mealType: type,
            recipeId: randomRecipe._id,
          });
        }
      }
    }

    // 3. Insert new plans
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
