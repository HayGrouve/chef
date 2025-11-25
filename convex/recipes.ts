import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { PREDEFINED_TAGS } from "../lib/constants";

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

    if (args.tags) {
      const validTags = args.tags.every((tag) =>
        (PREDEFINED_TAGS as unknown as string[]).includes(tag)
      );
      if (!validTags) {
        throw new Error("Invalid tags provided");
      }
    }

    const recipe = {
      ...args,
      userId: identity.subject,
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

    if (args.tags) {
      const validTags = args.tags.every((tag) =>
        (PREDEFINED_TAGS as unknown as string[]).includes(tag)
      );
      if (!validTags) {
        throw new Error("Invalid tags provided");
      }
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

// Helper to check if a recipe is favorited by the current user
async function isRecipeFavorite(
  ctx: any,
  recipeId: any,
  userId: string | undefined
) {
  if (!userId) return false;
  const favorite = await ctx.db
    .query("favorites")
    .withIndex("by_user_recipe", (q: any) =>
      q.eq("userId", userId).eq("recipeId", recipeId)
    )
    .unique();
  return !!favorite;
}

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
    const userId = identity?.subject;

    // If filtering by favorites only, we need to query the favorites table first
    if (args.favoritesOnly && userId) {
      // Note: Pagination with this approach is tricky because we need to paginate the favorites table,
      // then fetch the recipes.
      // However, if we also have other filters (search, difficulty, etc.), it gets complicated.
      // For simplicity in this iteration, we'll paginate the favorites query and then fetch recipes.
      // If other filters are present, we might under-fetch a page, but that's a common tradeoff in NoSQL.

      const favorites = await ctx.db
        .query("favorites")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .paginate(args.paginationOpts);

      const recipes = await Promise.all(
        favorites.page.map(async (fav) => {
          const recipe = await ctx.db.get(fav.recipeId);
          return recipe;
        })
      );

      // Filter nulls (deleted recipes) and apply other filters in memory (since we can't easily combine index query)
      let filteredRecipes = recipes.filter(
        (r): r is NonNullable<typeof r> => r !== null
      );

      if (args.search) {
        const searchLower = args.search.toLowerCase();
        filteredRecipes = filteredRecipes.filter((r) =>
          r.title.toLowerCase().includes(searchLower)
        );
      }
      if (args.difficulty && args.difficulty !== "all") {
        filteredRecipes = filteredRecipes.filter(
          (r) => r.difficulty === args.difficulty
        );
      }
      if (args.maxTime && args.maxTime !== 180) {
        filteredRecipes = filteredRecipes.filter(
          (r) => (r.cookingTime || 0) <= args.maxTime!
        );
      }

      const pageWithDetails = await Promise.all(
        filteredRecipes.map(async (recipe) => {
          let imageUrl = null;
          if (recipe.storageId) {
            imageUrl = await ctx.storage.getUrl(recipe.storageId);
          }

          let authorName = undefined;
          if (recipe.userId !== userId) {
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
            isFavorite: true, // Since we queried from favorites table
          };
        })
      );

      return {
        ...favorites,
        page: pageWithDetails,
      };
    }

    // Normal listing logic
    let queryBuilder;
    const myRecipesOnly = args.myRecipesOnly ?? false;

    if (args.search) {
      let searchResults;

      if (myRecipesOnly && userId) {
        // Filter by userId for my recipes
        searchResults = await ctx.db
          .query("recipes")
          .withSearchIndex("search_recipes", (q) =>
            q.search("title", args.search!).eq("userId", userId)
          )
          .collect();
      } else {
        // Filter by isPublic for all recipes
        searchResults = await ctx.db
          .query("recipes")
          .withSearchIndex("search_recipes", (q) =>
            q.search("title", args.search!).eq("isPublic", true)
          )
          .collect();
      }

      // Apply other filters in memory (Convex search queries don't support inequality filters like lte)
      let filtered = searchResults;

      if (args.difficulty && args.difficulty !== "all") {
        filtered = filtered.filter((r) => r.difficulty === args.difficulty);
      }

      if (args.maxTime) {
        // Include items with NO cooking time (undefined/null) or items <= maxTime
        filtered = filtered.filter(
          (r) => !r.cookingTime || r.cookingTime <= args.maxTime!
        );
      }

      // Manual pagination for search results
      const start = args.paginationOpts.cursor
        ? parseInt(args.paginationOpts.cursor, 10)
        : 0;
      const end = start + args.paginationOpts.numItems;
      const page = filtered.slice(start, end);

      const pageWithDetails = await Promise.all(
        page.map(async (recipe) => {
          let imageUrl = null;
          if (recipe.storageId) {
            imageUrl = await ctx.storage.getUrl(recipe.storageId);
          }
          let authorName = undefined;
          if (recipe.userId !== userId) {
            const user = await ctx.db
              .query("users")
              .withIndex("by_userId", (q) => q.eq("userId", recipe.userId))
              .unique();
            authorName = user?.name;
          }
          const isFavorite = await isRecipeFavorite(ctx, recipe._id, userId);
          return { ...recipe, imageUrl, authorName, isFavorite };
        })
      );

      return {
        page: pageWithDetails,
        isDone: end >= filtered.length,
        continueCursor: end < filtered.length ? end.toString() : "",
      };
    } else {
      queryBuilder = ctx.db.query("recipes");

      if (myRecipesOnly && userId) {
        queryBuilder = queryBuilder.filter((q) =>
          q.eq(q.field("userId"), userId)
        );
      } else if (userId) {
        queryBuilder = queryBuilder.filter((q) =>
          q.or(q.eq(q.field("isPublic"), true), q.eq(q.field("userId"), userId))
        );
      } else {
        // Unauthenticated user sees public recipes only
        queryBuilder = queryBuilder.filter((q) =>
          q.eq(q.field("isPublic"), true)
        );
      }

      queryBuilder = queryBuilder.order("desc");

      if (args.difficulty) {
        queryBuilder = queryBuilder.filter((q: any) =>
          q.eq(q.field("difficulty"), args.difficulty)
        );
      }

      if (args.maxTime) {
        queryBuilder = queryBuilder.filter((q: any) =>
          q.or(
            q.eq(q.field("cookingTime"), undefined),
            q.lte(q.field("cookingTime"), args.maxTime)
          )
        );
      }

      const paginatedResult = await queryBuilder.paginate(args.paginationOpts);

      const pageWithDetails = await Promise.all(
        paginatedResult.page.map(async (recipe) => {
          let imageUrl = null;
          if (recipe.storageId) {
            imageUrl = await ctx.storage.getUrl(recipe.storageId);
          }

          let authorName = undefined;
          if (recipe.userId !== userId) {
            const user = await ctx.db
              .query("users")
              .withIndex("by_userId", (q) => q.eq("userId", recipe.userId))
              .unique();
            authorName = user?.name;
          }

          const isFavorite = await isRecipeFavorite(ctx, recipe._id, userId);

          return {
            ...recipe,
            imageUrl,
            authorName,
            isFavorite,
          };
        })
      );

      return {
        ...paginatedResult,
        page: pageWithDetails,
      };
    }
  },
});

// List all recipes for the authenticated user (simple list for dropdowns etc)
export const listAll = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    if (!userId) {
      return [];
    }

    const recipes = await ctx.db
      .query("recipes")
      .filter((q) =>
        q.or(q.eq(q.field("userId"), userId), q.eq(q.field("isPublic"), true))
      )
      .collect();

    return await Promise.all(
      recipes.map(async (recipe) => {
        let imageUrl = null;
        if (recipe.storageId) {
          imageUrl = await ctx.storage.getUrl(recipe.storageId);
        }
        const isFavorite = await isRecipeFavorite(
          ctx,
          recipe._id,
          userId
        );
        return {
          ...recipe,
          imageUrl,
          isFavorite,
        };
      })
    );
  },
});

// Get a public recipe by ID
export const getPublic = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

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

    const isFavorite = await isRecipeFavorite(ctx, recipe._id, userId);
    const isOwner = userId === recipe.userId;

    return {
      ...recipe,
      imageUrl,
      authorName: user?.name,
      isFavorite,
      isOwner,
    };
  },
});

// Get a recipe by ID
export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

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

    const isFavorite = await isRecipeFavorite(ctx, recipe._id, userId);
    const isOwner = userId === recipe.userId;

    return {
      ...recipe,
      imageUrl,
      authorName: user?.name,
      isFavorite,
      isOwner,
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
    const userId = identity.subject;

    if (args.ingredients.length === 0) {
      return [];
    }

    const recipes = await ctx.db
      .query("recipes")
      .filter((q) =>
        q.or(q.eq(q.field("userId"), userId), q.eq(q.field("isPublic"), true))
      )
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

        const isFavorite = await isRecipeFavorite(
          ctx,
          recipe._id,
          identity.subject
        );

        return {
          ...recipe,
          imageUrl,
          matchCount,
          matchPercentage: (matchCount / recipe.ingredients.length) * 100,
          missingIngredients,
          matchingIngredients,
          isFavorite,
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
    const identity = await ctx.auth.getUserIdentity();
    const currentUserId = identity?.subject;

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
        const isFavorite = await isRecipeFavorite(
          ctx,
          recipe._id,
          currentUserId
        );
        return {
          ...recipe,
          imageUrl,
          isFavorite,
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

    // Check if already favorited
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_recipe", (q) =>
        q.eq("userId", identity.subject).eq("recipeId", args.id)
      )
      .unique();

    if (existingFavorite) {
      await ctx.db.delete(existingFavorite._id);
    } else {
      await ctx.db.insert("favorites", {
        userId: identity.subject,
        recipeId: args.id,
      });
    }
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

    // Also delete associated favorites?
    // Ideally yes, to keep DB clean.
    // Note: The index is "by_user_recipe": ["userId", "recipeId"].
    // Querying by just "recipeId" efficiently requires an index starting with "recipeId".
    // Without it, we can't efficiently delete all favorites for this recipe.
    // For now, we will skip deleting favorites to avoid full table scans.
    // In a production app, we should add an index on "recipeId" to the favorites table.

    // Delete the image from storage if it exists
    if (recipe.storageId) {
      await ctx.storage.delete(recipe.storageId);
    }

    return await ctx.db.delete(args.id);
  },
});
