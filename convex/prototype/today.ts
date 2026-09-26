// PROTOTYPE — "Today" kitchen hub (/prototype/today). Not used by the main app.
import { query } from "../_generated/server";

/**
 * Everything the hub needs in one round trip: this week's plan (with
 * ingredients, so the client can work out what to buy), the open shopping
 * list, the user's own recipes and a few public ones to discover.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const imageUrl = async (storageId: string) =>
      storageId ? await ctx.storage.getUrl(storageId) : null;

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
            recipe: {
              _id: recipe._id,
              title: recipe.title,
              imageUrl: await imageUrl(recipe.storageId),
              cookingTime: recipe.cookingTime,
              difficulty: recipe.difficulty,
              ingredients: recipe.ingredients,
              ingredientKeys: recipe.ingredientKeys,
            },
          };
        })
      )
    ).filter((m) => m !== null);

    const shopping = await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mine = await ctx.db
      .query("recipes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(12);

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(12);
    const favoriteIds = new Set<string>(favorites.map((f) => f.recipeId));

    // Prototype shortcut: newest recipes, filtered in memory. A production
    // version would add an index on isPublic.
    const recent = await ctx.db.query("recipes").order("desc").take(60);
    const publicRecipes = recent
      .filter((r) => r.isPublic && r.userId !== userId)
      .slice(0, 8);

    const card = async (recipe: (typeof mine)[number]) => ({
      _id: recipe._id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: await imageUrl(recipe.storageId),
      cookingTime: recipe.cookingTime,
      difficulty: recipe.difficulty,
      tags: recipe.tags ?? [],
      authorName: recipe.userId === userId ? undefined : recipe.authorName,
      isFavorite: favoriteIds.has(recipe._id),
    });

    return {
      firstName: identity.givenName ?? identity.name?.split(" ")[0] ?? null,
      meals,
      shopping: {
        open: shopping
          .filter((i) => !i.isChecked)
          .map((i) => ({ _id: i._id, ingredient: i.ingredient })),
        checkedCount: shopping.filter((i) => i.isChecked).length,
      },
      myRecipes: await Promise.all(mine.map(card)),
      discover: await Promise.all(publicRecipes.map(card)),
      favoriteCount: favorites.length,
    };
  },
});
