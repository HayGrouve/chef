export const PREDEFINED_TAGS = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Dessert",
  "Snack",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Keto",
  "Paleo",
  "Italian",
  "Mexican",
  "Asian",
  "Mediterranean",
  "American",
  "Quick & Easy",
  "Healthy",
  "Comfort Food",
  "Spicy",
] as const;


/** Shared by the recipe form and the server-side checks in convex/recipes.ts. */
export const RECIPE_LIMITS = {
  title: 120,
  description: 2000,
  ingredients: 100,
  ingredientLength: 300,
  steps: 100,
  stepLength: 2000,
  cookingTime: 2880,
  calories: 20000,
} as const;
