import { query } from "./_generated/server";

/**
 * Suggestions for the ⌘K palette: the week's planned meals (for "Up next" and
 * to show what's already in a slot when planning) and the user's newest recipes.
 */
export const suggestions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const meals = (
      await Promise.all(
        plans.map(async (plan) => {
          const recipe = await ctx.db.get(plan.recipeId);
          if (!recipe) return null;
          return {
            _id: plan._id,
            day: plan.date,
            mealType: plan.mealType.toLowerCase(),
            recipe: { _id: recipe._id, title: recipe.title },
          };
        })
      )
    ).filter((m) => m !== null);

    const recent = await ctx.db
      .query("recipes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);

    return {
      meals,
      myRecipes: recent.map((r) => ({ _id: r._id, title: r.title, cookingTime: r.cookingTime })),
    };
  },
});
