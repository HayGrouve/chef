import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";
import { PREDEFINED_TAGS, RECIPE_LIMITS } from "../lib/constants";
import { internal } from "./_generated/api";
import { pantryTermMatches } from "./ingredientMatch";
import { canReadRecipe } from "./access";

type RecipeInput = {
  title: string;
  format?: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tags?: string[];
  cookingTime?: number;
  difficulty?: string;
  calories?: number;
};

/** Trims and validates recipe fields; the client validates too, but can be bypassed. */
function cleanRecipeInput<T extends RecipeInput>(args: T): T {
  const fail = (message: string): never => {
    throw new ConvexError(message);
  };
  const L = RECIPE_LIMITS;
  const title = args.title.trim();
  if (!title) fail("Give the recipe a title.");
  if (title.length > L.title) fail(`Keep the title under ${L.title} characters.`);
  const description = args.description.trim();
  if (description.length > L.description) {
    fail(`Keep the description under ${L.description} characters.`);
  }
  const lines = (list: string[], what: string, max: number, maxLength: number) => {
    const cleaned = list.map((line) => line.trim()).filter(Boolean);
    if (cleaned.length === 0) fail(`Add at least one ${what}.`);
    if (cleaned.length > max) fail(`A recipe can have at most ${max} ${what}s.`);
    if (cleaned.some((line) => line.length > maxLength)) {
      fail(`Keep each ${what} under ${maxLength} characters.`);
    }
    return cleaned;
  };
  const ingredients = lines(args.ingredients, "ingredient", L.ingredients, L.ingredientLength);
  const steps = lines(args.steps, "step", L.steps, L.stepLength);
  const inRange = (value: number | undefined, min: number, max: number) =>
    value === undefined || (Number.isFinite(value) && value >= min && value <= max);
  if (!inRange(args.cookingTime, 1, L.cookingTime)) {
    fail(`Cooking time must be between 1 and ${L.cookingTime} minutes.`);
  }
  if (!inRange(args.calories, 0, L.calories)) {
    fail(`Calories must be between 0 and ${L.calories}.`);
  }
  if (args.difficulty !== undefined && !["Easy", "Medium", "Hard"].includes(args.difficulty)) {
    fail("Difficulty must be Easy, Medium or Hard.");
  }
  if (args.format !== undefined && args.format.length > 50) fail("Invalid image format.");
  if (args.tags && !args.tags.every((tag) => (PREDEFINED_TAGS as readonly string[]).includes(tag))) {
    fail("Invalid tags provided");
  }
  return {
    ...args,
    title,
    description,
    ingredients,
    steps,
    tags: args.tags && Array.from(new Set(args.tags)),
    cookingTime: args.cookingTime === undefined ? undefined : Math.round(args.cookingTime),
    calories: args.calories === undefined ? undefined : Math.round(args.calories),
  };
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Storage ids aren't tied to an uploader, and every recipe query returns its
 * storageId, so an image may only ever belong to one recipe. Otherwise anyone
 * could attach someone else's photo and then delete it with their own recipe.
 */
async function assertImageAvailable(
  ctx: MutationCtx,
  storageId: string,
  recipeId?: Id<"recipes">
) {
  if (!storageId) return;
  const fileId = ctx.db.system.normalizeId("_storage", storageId);
  const file = fileId && (await ctx.db.system.get(fileId));
  if (!file) {
    throw new ConvexError("That image upload is invalid. Try adding the photo again.");
  }
  // Upload URLs accept any file; only images may become recipe photos
  const notImage = file.contentType !== undefined && !file.contentType.startsWith("image/");
  if (notImage || file.size > MAX_IMAGE_BYTES) {
    throw new ConvexError("Recipe photos must be images under 10 MB.");
  }
  const users = await ctx.db
    .query("recipes")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .take(2);
  if (users.some((recipe) => recipe._id !== recipeId)) {
    throw new ConvexError("That image belongs to another recipe.");
  }
}

/** Deletes a recipe image unless another recipe still uses it. */
async function deleteImageIfUnused(
  ctx: MutationCtx,
  storageId: string,
  recipeId: Id<"recipes">
) {
  const fileId = storageId ? ctx.db.system.normalizeId("_storage", storageId) : null;
  if (!fileId) return;
  const users = await ctx.db
    .query("recipes")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .take(2);
  if (users.some((recipe) => recipe._id !== recipeId)) return;
  if (await ctx.db.system.get(fileId)) {
    await ctx.storage.delete(fileId);
  }
}

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
  handler: async (ctx, rawArgs) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const args = cleanRecipeInput(rawArgs);
    await assertImageAvailable(ctx, args.storageId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
      
    const authorName = user?.name || "";
    const searchText = `${args.title} ${authorName}`.toLowerCase();

    const recipe = {
      ...args,
      userId: identity.subject,
      isPublic: args.isPublic ?? false,
      tags: args.tags ?? [],
      authorName,
      searchText,
    };
    const recipeId = await ctx.db.insert("recipes", recipe);
    // Tag ingredients with canonical names for pantry matching (runs in the background)
    await ctx.scheduler.runAfter(0, internal.ai.tagRecipeIngredients, { recipeId });
    return recipeId;
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
  handler: async (ctx, rawArgs) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const recipe = await ctx.db.get(rawArgs.id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }

    if (recipe.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const args = cleanRecipeInput(rawArgs);
    const imageChanged = !!args.storageId && args.storageId !== recipe.storageId;
    if (imageChanged) {
      await assertImageAvailable(ctx, args.storageId!, args.id);
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
      
    const authorName = user?.name || "";
    const searchText = `${args.title} ${authorName}`.toLowerCase();

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
      authorName,
      searchText,
    };

    // Only update storageId if a new one is provided
    if (imageChanged) {
      updates.storageId = args.storageId;
      updates.format = args.format;
    }

    const ingredientsChanged =
      recipe.ingredients.length !== args.ingredients.length ||
      recipe.ingredients.some((line, i) => line !== args.ingredients[i]);
    if (ingredientsChanged) {
      // Old keys no longer line up with the ingredient lines; re-tag in the background
      updates.ingredientKeys = undefined;
    }

    await ctx.db.patch(args.id, updates);
    if (imageChanged) {
      await deleteImageIfUnused(ctx, recipe.storageId, args.id);
    }
    if (ingredientsChanged) {
      await ctx.scheduler.runAfter(0, internal.ai.tagRecipeIngredients, {
        recipeId: args.id,
      });
    }
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

    // Signed-out visitors have no favorites or recipes of their own
    if ((args.favoritesOnly || args.myRecipesOnly) && !userId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

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

      // Drop deleted recipes and ones that went private since they were
      // favorited, then apply other filters in memory (since we can't easily combine index query)
      let filteredRecipes = recipes.filter((r) => canReadRecipe(r, userId));

      if (args.search) {
        const searchLower = args.search.toLowerCase();
        filteredRecipes = filteredRecipes.filter((r) =>
          r.searchText?.toLowerCase().includes(searchLower) ||
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
          .withSearchIndex("search_recipes", (q) => {
            let sq = q.search("searchText", args.search!).eq("userId", userId);
            if (args.difficulty && args.difficulty !== "all") {
              sq = sq.eq("difficulty", args.difficulty);
            }
            return sq;
          })
          .paginate(args.paginationOpts);
      } else {
        // Filter by isPublic for all recipes
        searchResults = await ctx.db
          .query("recipes")
          .withSearchIndex("search_recipes", (q) => {
            let sq = q.search("searchText", args.search!).eq("isPublic", true);
            if (args.difficulty && args.difficulty !== "all") {
              sq = sq.eq("difficulty", args.difficulty);
            }
            return sq;
          })
          .paginate(args.paginationOpts);
      }

      // Apply maxTime filter in memory (Convex search queries don't support inequality filters)
      // Note: This might result in slightly fewer items than requested on this specific page
      let page = searchResults.page;
      if (args.maxTime) {
        page = page.filter(
          (r) => !r.cookingTime || r.cookingTime <= args.maxTime!
        );
      }

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
        ...searchResults,
        page: pageWithDetails,
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

      if (args.difficulty && args.difficulty !== "all") {
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
// Both getters take any string: ids come straight from the URL, and a
// malformed one should read as "not found" rather than throw.
export const getPublic = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    const id = ctx.db.normalizeId("recipes", args.id);
    const recipe = id && (await ctx.db.get(id));
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
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    const id = ctx.db.normalizeId("recipes", args.id);
    const recipe = id && (await ctx.db.get(id));
    // Private recipes are only visible to their owner
    if (!canReadRecipe(recipe, userId)) {
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

        recipe.ingredients.forEach((ingredientLine, i) => {
          const keys = recipe.ingredientKeys?.[i] ?? [];
          const isMatch = userIngredients.some((userIng) =>
            pantryTermMatches(userIng, ingredientLine, keys)
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

    // Check if already favorited
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_recipe", (q) =>
        q.eq("userId", identity.subject).eq("recipeId", args.id)
      )
      .unique();

    if (existingFavorite) {
      // Unfavoriting always works, even if the recipe has since gone private
      await ctx.db.delete(existingFavorite._id);
    } else {
      const recipe = await ctx.db.get(args.id);
      if (!canReadRecipe(recipe, identity.subject)) {
        throw new Error("Recipe not found");
      }
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

    // Other people's favorites, plans and list items are cleaned up in the
    // background, in batches: anyone can reference a public recipe, so there
    // may be more rows than one mutation is allowed to touch.
    await ctx.scheduler.runAfter(0, internal.recipes.cleanupReferences, { recipeId: args.id });

    await deleteImageIfUnused(ctx, recipe.storageId, recipe._id);

    return await ctx.db.delete(args.id);
  },
});

const CLEANUP_BATCH = 200;

/**
 * Removes favorites and meal plans that point at a deleted recipe. Shopping-list
 * items stay (people may still need to buy them) but lose the link. Runs in
 * batches and reschedules itself until nothing is left.
 */
export const cleanupReferences = internalMutation({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, { recipeId }) => {
    const [favorites, plans, items] = await Promise.all([
      ctx.db.query("favorites").withIndex("by_recipe", (q) => q.eq("recipeId", recipeId)).take(CLEANUP_BATCH),
      ctx.db.query("mealPlans").withIndex("by_recipe", (q) => q.eq("recipeId", recipeId)).take(CLEANUP_BATCH),
      ctx.db.query("shoppingList").withIndex("by_recipe", (q) => q.eq("recipeId", recipeId)).take(CLEANUP_BATCH),
    ]);
    for (const favorite of favorites) await ctx.db.delete(favorite._id);
    for (const plan of plans) await ctx.db.delete(plan._id);
    for (const item of items) await ctx.db.patch(item._id, { recipeId: undefined });

    if ([favorites, plans, items].some((rows) => rows.length === CLEANUP_BATCH)) {
      await ctx.scheduler.runAfter(0, internal.recipes.cleanupReferences, { recipeId });
    }
  },
});
