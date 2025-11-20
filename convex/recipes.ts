import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate an upload URL for storing recipe images
export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return await ctx.storage.generateUploadUrl();
});

// Create a new recipe
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    ingredients: v.array(v.string()),
    steps: v.array(v.string()),
    storageId: v.string(),
    format: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const recipe = {
      ...args,
      userId: identity.subject,
      isFavorite: false,
      isPublic: args.isPublic ?? false,
      tags: args.tags ?? [],
    };
    return await ctx.db.insert("recipes", recipe);
  },
});

// Update an existing recipe
export const update = mutation({
  args: {
    id: v.id("recipes"),
    title: v.string(),
    description: v.string(),
    ingredients: v.array(v.string()),
    steps: v.array(v.string()),
    storageId: v.optional(v.string()), // Optional because we might not change the image
    format: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const recipe = await ctx.db.get(args.id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }

    if (recipe.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Prepare update fields
    const updates: any = {
      title: args.title,
      description: args.description,
      ingredients: args.ingredients,
      steps: args.steps,
      tags: args.tags,
      isPublic: args.isPublic,
    };

    // Only update storageId if a new one is provided
    if (args.storageId) {
      updates.storageId = args.storageId;
      updates.format = args.format;
    }

    return await ctx.db.patch(args.id, updates);
  },
});

// List all recipes for the authenticated user
export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    
    let recipes;

    if (args.search) {
      // Note: This is a simple client-side filter simulation on the server
      // For large datasets, use Convex's search index
      const allRecipes = await ctx.db
        .query("recipes")
        .filter((q) => q.eq(q.field("userId"), identity.subject))
        .collect();
      
      recipes = allRecipes.filter((r) => 
        r.title.toLowerCase().includes(args.search!.toLowerCase())
      );
    } else {
      recipes = await ctx.db
        .query("recipes")
        .filter((q) => q.eq(q.field("userId"), identity.subject))
        .collect();
    }

    // Sort: Favorites first
    recipes.sort((a, b) => {
      if (a.isFavorite === b.isFavorite) return 0;
      return a.isFavorite ? -1 : 1;
    });

    // Add image URLs to each recipe
    return await Promise.all(
      recipes.map(async (recipe) => {
        let imageUrl = null;
        if (recipe.storageId) {
          imageUrl = await ctx.storage.getUrl(recipe.storageId);
        }
        return {
          ...recipe,
          imageUrl,
        };
      })
    );
  },
});

// Get a public recipe by ID
export const getPublic = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || !recipe.isPublic) {
      return null;
    }
    
    let imageUrl = null;
    if (recipe.storageId) {
      imageUrl = await ctx.storage.getUrl(recipe.storageId);
    }

    // Fetch author details
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", recipe.userId))
      .unique();

    return {
      ...recipe,
      imageUrl,
      authorName: user?.name,
    };
  },
});

// Get a recipe by ID
export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe) {
      return null;
    }
    
    let imageUrl = null;
    if (recipe.storageId) {
      imageUrl = await ctx.storage.getUrl(recipe.storageId);
    }

    // Fetch author details
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", recipe.userId))
      .unique();

    return {
      ...recipe,
      imageUrl,
      authorName: user?.name,
    };
  },
});

// Toggle Favorite status
export const toggleFavorite = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    
    const recipe = await ctx.db.get(args.id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }

    if (recipe.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, { isFavorite: !recipe.isFavorite });
  },
});

// Delete a recipe
export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    
    const recipe = await ctx.db.get(args.id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }

    if (recipe.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.delete(args.id);
  },
});
