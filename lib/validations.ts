import { z } from "zod";
import { PREDEFINED_TAGS, RECIPE_LIMITS as L } from "./constants";

export const recipeSchema = z.object({
  title: z.string().trim().min(2, { message: "Title must be at least 2 characters." })
    .max(L.title, { message: `Title must be at most ${L.title} characters.` }),
  description: z.string().trim().min(10, { message: "Description must be at least 10 characters." })
    .max(L.description, { message: `Description must be at most ${L.description} characters.` }),
  cookingTime: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().min(1, { message: "Cooking time must be at least 1 minute." })
      .max(L.cookingTime, { message: `Cooking time must be at most ${L.cookingTime} minutes.` }).optional()
  ).optional(),
  calories: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().min(0, { message: "Calories cannot be negative." })
      .max(L.calories, { message: `Calories must be at most ${L.calories}.` }).optional()
  ).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  ingredients: z.array(z.object({
    value: z.string().min(1, { message: "Ingredient cannot be empty." })
      .max(L.ingredientLength, { message: `Keep each ingredient under ${L.ingredientLength} characters.` })
  })).min(1, { message: "At least one ingredient is required." })
    .max(L.ingredients, { message: `A recipe can have at most ${L.ingredients} ingredients.` }),
  steps: z.array(z.object({
    value: z.string().min(1, { message: "Step cannot be empty." })
      .max(L.stepLength, { message: `Keep each step under ${L.stepLength} characters.` })
  })).min(1, { message: "At least one step is required." })
    .max(L.steps, { message: `A recipe can have at most ${L.steps} steps.` }),
  tags: z.array(z.string()).refine((tags) => tags.every((tag) => (PREDEFINED_TAGS as unknown as string[]).includes(tag)), {
    message: "Invalid tags provided.",
  }).optional(),
  isPublic: z.boolean().default(true),
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;
