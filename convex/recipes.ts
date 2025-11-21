import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

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
    cookingTime: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    calories: v.optional(v.number()),
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
    cookingTime: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    calories: v.optional(v.number()),
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
      cookingTime: args.cookingTime,
      difficulty: args.difficulty,
      calories: args.calories,
    };

    // Only update storageId if a new one is provided
    if (args.storageId) {
      updates.storageId = args.storageId;
      updates.format = args.format;
    }

    return await ctx.db.patch(args.id, updates);
  },
});

// List all recipes for the authenticated user (paginated)
export const list = query({
  args: {
    search: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    maxTime: v.optional(v.number()),
    favoritesOnly: v.optional(v.boolean()),
    myRecipesOnly: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    let queryBuilder;
    const myRecipesOnly = args.myRecipesOnly ?? false;

    if (args.search) {
      if (myRecipesOnly) {
        queryBuilder = ctx.db
          .query("recipes")
          .withSearchIndex("search_recipes", (q) =>
            q
              .search("title", args.search!)
              .eq("userId", identity.subject)
          );
      } else {
        queryBuilder = ctx.db
          .query("recipes")
          .withSearchIndex("search_recipes", (q) =>
            q
              .search("title", args.search!)
              .eq("isPublic", true)
          );
      }
    } else {
      queryBuilder = ctx.db.query("recipes");
      
      if (myRecipesOnly) {
        queryBuilder = queryBuilder.filter((q) => 
          q.eq(q.field("userId"), identity.subject)
        );
      } else {
        queryBuilder = queryBuilder.filter((q) =>
          q.or(
            q.eq(q.field("isPublic"), true),
            q.eq(q.field("userId"), identity.subject)
          )
        );
      }
      
      queryBuilder = queryBuilder.order("desc");
    }

    if (args.difficulty) {
        queryBuilder = queryBuilder.filter((q: any) => q.eq(q.field("difficulty"), args.difficulty));
    }

    if (args.maxTime) {
        queryBuilder = queryBuilder.filter((q: any) => q.lte(q.field("cookingTime"), args.maxTime));
    }

    if (args.favoritesOnly) {
        queryBuilder = queryBuilder.filter((q: any) => q.eq(q.field("isFavorite"), true));
    }

    const paginatedResult = await queryBuilder.paginate(args.paginationOpts);

    const pageWithDetails = await Promise.all(
      paginatedResult.page.map(async (recipe) => {
        let imageUrl = null;
        if (recipe.storageId) {
          imageUrl = await ctx.storage.getUrl(recipe.storageId);
        }

        let authorName = undefined;
        if (recipe.userId !== identity.subject) {
            const user = await ctx.db
              .query("users")
              .withIndex("by_userId", (q) => q.eq("userId", recipe.userId))
              .unique();
            authorName = user?.name;
        }

        return {
          ...recipe,
          imageUrl,
          authorName,
        };
      })
    );

    return {
        ...paginatedResult,
        page: pageWithDetails
    };
  },
});

// List all recipes for the authenticated user (simple list for dropdowns etc)
export const listAll = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const recipes = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

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

// Search by ingredients
export const searchByIngredients = query({
  args: { ingredients: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    if (args.ingredients.length === 0) {
      return [];
    }

    const recipes = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const userIngredients = args.ingredients.map((i) => i.toLowerCase().trim());

    const recipesWithScore = await Promise.all(
      recipes.map(async (recipe) => {
        let matchCount = 0;
        const missingIngredients: string[] = [];
        const matchingIngredients: string[] = [];

        recipe.ingredients.forEach((ingredientLine) => {
          const ingLower = ingredientLine.toLowerCase();
          const isMatch = userIngredients.some((userIng) =>
            ingLower.includes(userIng)
          );

          if (isMatch) {
            matchCount++;
            matchingIngredients.push(ingredientLine);
          } else {
            missingIngredients.push(ingredientLine);
          }
        });

        if (matchCount === 0) return null;

        let imageUrl = null;
        if (recipe.storageId) {
          imageUrl = await ctx.storage.getUrl(recipe.storageId);
        }

        return {
          ...recipe,
          imageUrl,
          matchCount,
          matchPercentage: (matchCount / recipe.ingredients.length) * 100,
          missingIngredients,
          matchingIngredients,
        };
      })
    );

    // Filter out nulls and sort by match percentage
    return recipesWithScore
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  },
});

// List public recipes by user
export const listPublic = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const recipes = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();

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
