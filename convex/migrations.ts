import { mutation } from "./_generated/server";

export const backfillSearchText = mutation({
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").collect();
    
    let count = 0;
    for (const recipe of recipes) {
      if (!recipe.searchText || !recipe.authorName) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_userId", (q) => q.eq("userId", recipe.userId))
          .unique();
          
        const authorName = user?.name || "";
        const searchText = `${recipe.title} ${authorName}`.toLowerCase();
        
        await ctx.db.patch(recipe._id, {
          authorName,
          searchText,
        });
        count++;
      }
    }
    
    return `Backfilled ${count} recipes`;
  },
});