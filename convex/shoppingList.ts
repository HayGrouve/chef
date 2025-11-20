import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all shopping list items for the authenticated user
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

// List all shopping list items with recipe details
export const listWithDetails = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const items = await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return await Promise.all(
      items.map(async (item) => {
        let recipeTitle = undefined;
        if (item.recipeId) {
          const recipe = await ctx.db.get(item.recipeId);
          if (recipe) {
            recipeTitle = recipe.title;
          }
        }
        return {
          ...item,
          recipeTitle,
        };
      })
    );
  },
});

// Add an item to the shopping list
export const add = mutation({
  args: {
    ingredient: v.string(),
    recipeId: v.optional(v.id("recipes")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    return await ctx.db.insert("shoppingList", {
      userId: identity.subject,
      ingredient: args.ingredient,
      isChecked: false,
      recipeId: args.recipeId,
    });
  },
});

// Add multiple items (e.g., from a recipe)
export const addBatch = mutation({
  args: {
    ingredients: v.array(v.string()),
    recipeId: v.optional(v.id("recipes")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    
    await Promise.all(
      args.ingredients.map((ingredient) =>
        ctx.db.insert("shoppingList", {
          userId: identity.subject,
          ingredient,
          isChecked: false,
          recipeId: args.recipeId,
        })
      )
    );
  },
});

// Toggle checked status
export const toggle = mutation({
  args: { id: v.id("shoppingList") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.id, { isChecked: !item.isChecked });
  },
});

// Remove an item
export const remove = mutation({
  args: { id: v.id("shoppingList") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

// Remove all checked items
export const clearChecked = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const items = await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isChecked"), true))
      .collect();
    
    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
  },
});
