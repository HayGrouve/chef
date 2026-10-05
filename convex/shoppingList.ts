import { v, ConvexError } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { getCategory } from "./categories";
import { canReadRecipe, readableRecipeId } from "./access";

export const MAX_ITEM_LENGTH = 300;
export const MAX_BATCH = 200;
export const MAX_LIST_ITEMS = 1000;

/** Trims an item and rejects empty or oversized ones. */
export function cleanItem(ingredient: string) {
  const cleaned = ingredient.trim();
  if (!cleaned) throw new ConvexError("Item can't be empty.");
  if (cleaned.length > MAX_ITEM_LENGTH) {
    throw new ConvexError(`Keep items under ${MAX_ITEM_LENGTH} characters.`);
  }
  return cleaned;
}

/** Keeps a list small enough that reading and clearing it stays within limits. */
export async function assertRoomFor(ctx: MutationCtx, userId: string, count: number) {
  const existing = await ctx.db
    .query("shoppingList")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(MAX_LIST_ITEMS);
  if (existing.length + count > MAX_LIST_ITEMS) {
    throw new ConvexError(
      `Your shopping list is full (${MAX_LIST_ITEMS} items). Clear some items first.`
    );
  }
}

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

// Get the count of unchecked items for the badge
export const getBadgeCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }
    const items = await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isChecked"), false))
      .collect();
    return items.length;
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
          if (canReadRecipe(recipe, identity.subject)) {
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
    const ingredient = cleanItem(args.ingredient);
    await assertRoomFor(ctx, identity.subject, 1);
    return await ctx.db.insert("shoppingList", {
      userId: identity.subject,
      ingredient,
      isChecked: false,
      recipeId: await readableRecipeId(ctx, args.recipeId, identity.subject),
      category: getCategory(ingredient),
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
    
    // Note: For now we don't do complex merging on the server side to keep it simple
    // We just insert new items. Complex merging requires more robust parsing logic.
    // Returns the inserted ids so the client can offer "Undo".
    if (args.ingredients.length > MAX_BATCH) {
      throw new ConvexError(`Add at most ${MAX_BATCH} items at a time.`);
    }
    const ingredients = args.ingredients.map(cleanItem);
    await assertRoomFor(ctx, identity.subject, ingredients.length);
    const recipeId = await readableRecipeId(ctx, args.recipeId, identity.subject);
    return await Promise.all(
      ingredients.map((ingredient) =>
        ctx.db.insert("shoppingList", {
          userId: identity.subject,
          ingredient,
          isChecked: false,
          recipeId,
          category: getCategory(ingredient),
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

// Toggle checked status for multiple items
export const toggleBatch = mutation({
  args: { ids: v.array(v.id("shoppingList")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    
    await Promise.all(
      args.ids.map(async (id) => {
        const item = await ctx.db.get(id);
        if (!item || item.userId !== identity.subject) {
          return; // Skip unauthorized or missing items
        }
        await ctx.db.patch(id, { isChecked: !item.isChecked });
      })
    );
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

// Remove multiple items
export const removeBatch = mutation({
  args: { ids: v.array(v.id("shoppingList")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    
    await Promise.all(
      args.ids.map(async (id) => {
        const item = await ctx.db.get(id);
        if (!item || item.userId !== identity.subject) {
          return; // Skip unauthorized or missing items
        }
        await ctx.db.delete(id);
      })
    );
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

// Remove all items for the user
export const clearAll = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const items = await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    
    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
  },
});
