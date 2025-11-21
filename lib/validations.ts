import { z } from "zod";

export const recipeSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  cookingTime: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().min(1, { message: "Cooking time must be at least 1 minute." }).optional()
  ).optional(),
  calories: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().min(0, { message: "Calories cannot be negative." }).optional()
  ).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  ingredients: z.array(z.object({
    value: z.string().min(1, { message: "Ingredient cannot be empty." })
  })).min(1, { message: "At least one ingredient is required." }),
  steps: z.array(z.object({
    value: z.string().min(1, { message: "Step cannot be empty." })
  })).min(1, { message: "At least one step is required." }),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;
