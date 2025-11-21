import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
  .index("by_userId", ["userId"]), // Index to look up author by recipe.userId
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
  })
  .searchIndex("search_recipes", {
    searchField: "title",
    filterFields: ["userId", "isPublic"],
  })
  .searchIndex("search_ingredients_description", {
    searchField: "description",
  }),
  favorites: defineTable({
    userId: v.string(),
    recipeId: v.id("recipes"),
  })
  .index("by_user_recipe", ["userId", "recipeId"])
  .index("by_user", ["userId"]),
  shoppingList: defineTable({
    userId: v.string(),
    ingredient: v.string(),
    isChecked: v.boolean(),
    recipeId: v.optional(v.id("recipes")), // Optional link back to recipe
    category: v.optional(v.string()),
  }).index("by_user", ["userId"]),
  mealPlans: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    mealType: v.string(), // breakfast, lunch, dinner
    recipeId: v.id("recipes"),
  }).index("by_user_date", ["userId", "date"]),
});
