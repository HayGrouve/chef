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
        q.eq("userId", identity.subject)
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
          recipeImage: recipe?.storageId ? await ctx.storage.getUrl(recipe.storageId) : null,
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

// Remove a meal plan
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

