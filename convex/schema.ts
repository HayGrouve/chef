import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// One ingredient amount as marked by Gemini; see `Amount` in lib/quantities.ts
const amountValidator = v.object({
  text: v.string(),
  value: v.number(),
  max: v.optional(v.number()),
  unit: v.optional(v.string()),
  one: v.optional(v.string()),
  other: v.optional(v.string()),
  split: v.optional(v.union(v.literal("any"), v.literal("half"), v.literal("whole"))),
  fixed: v.optional(v.boolean()),
  metric: v.optional(v.object({ value: v.number(), unit: v.union(v.literal("g"), v.literal("ml")) })),
  restates: v.optional(v.boolean()),
});

// Per ingredient line; null where the AI's reading didn't check out
export const ingredientAmountsValidator = v.array(v.union(v.array(amountValidator), v.null()));

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
    userId: v.optional(v.string()), // The 'subject' field from the identity, matching recipes.userId
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_userId", ["userId"])
    .searchIndex("search_users", {
      searchField: "name",
    }),
  recipes: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    ingredients: v.array(v.string()),
    steps: v.array(v.string()),
    storageId: v.string(), // For the image
    format: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
    cookingTime: v.optional(v.number()),
    difficulty: v.optional(v.string()), // "Easy" | "Medium" | "Hard"
    calories: v.optional(v.number()),
    authorName: v.optional(v.string()),
    searchText: v.optional(v.string()),
    // Set by each edit; the edit form sends the version it loaded so a save
    // from a stale tab can't silently overwrite a newer one
    updatedAt: v.optional(v.number()),
    // AI-generated canonical names per ingredient line, used for pantry
    // matching, e.g. "200g spaghetti" -> ["spaghetti", "pasta"]
    ingredientKeys: v.optional(v.array(v.array(v.string()))),
    // AI-marked amounts per ingredient line, for scaling and metric conversion,
    // e.g. "1½ cups flour" -> 1.5 cups ≈ 180 g. Lines without fall back to a parser.
    ingredientAmounts: v.optional(ingredientAmountsValidator),
  })
    .index("by_userId", ["userId"])
    .index("by_isPublic", ["isPublic"])
    .index("by_storageId", ["storageId"])
    .searchIndex("search_recipes", {
      searchField: "searchText",
      filterFields: ["userId", "isPublic", "difficulty"],
    })
    .searchIndex("search_ingredients_description", {
      searchField: "description",
    }),
  favorites: defineTable({
    userId: v.string(),
    recipeId: v.id("recipes"),
  })
    .index("by_user_recipe", ["userId", "recipeId"])
    .index("by_user", ["userId"])
    .index("by_recipe", ["recipeId"]),
  shoppingList: defineTable({
    userId: v.string(),
    ingredient: v.string(),
    isChecked: v.boolean(),
    recipeId: v.optional(v.id("recipes")), // Optional link back to recipe
    category: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_recipe", ["recipeId"]),
  mealPlans: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    mealType: v.string(), // breakfast, lunch, dinner
    recipeId: v.id("recipes"),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_recipe", ["recipeId"]),
  rateLimits: defineTable({
    userId: v.string(),
    action: v.string(),
    lastCalledAt: v.number(),
    // Calls made in the window starting at lastCalledAt (quota-style limits)
    count: v.optional(v.number()),
  }).index("by_user_action", ["userId", "action"]),
});
