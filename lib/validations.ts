import { z } from "zod";
import { PREDEFINED_TAGS, RECIPE_LIMITS as L } from "./constants";

export const recipeSchema = z.object({
  title: z.string().trim().min(2, { message: "Заглавието трябва да е поне 2 знака." })
    .max(L.title, { message: `Заглавието може да е най-много ${L.title} знака.` }),
  description: z.string().trim().min(10, { message: "Описанието трябва да е поне 10 знака." })
    .max(L.description, { message: `Описанието може да е най-много ${L.description} знака.` }),
  cookingTime: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().min(1, { message: "Времето трябва да е поне 1 минута." })
      .max(L.cookingTime, { message: `Времето може да е най-много ${L.cookingTime} минути.` }).optional()
  ).optional(),
  calories: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().min(0, { message: "Калориите не може да са отрицателни." })
      .max(L.calories, { message: `Калориите може да са най-много ${L.calories}.` }).optional()
  ).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  ingredients: z.array(z.object({
    value: z.string().min(1, { message: "Съставката не може да е празна." })
      .max(L.ingredientLength, { message: `Всяка съставка може да е най-много ${L.ingredientLength} знака.` })
  })).min(1, { message: "Добави поне една съставка." })
    .max(L.ingredients, { message: `Рецептата може да има най-много ${L.ingredients} съставки.` }),
  steps: z.array(z.object({
    value: z.string().min(1, { message: "Стъпката не може да е празна." })
      .max(L.stepLength, { message: `Всяка стъпка може да е най-много ${L.stepLength} знака.` })
  })).min(1, { message: "Добави поне една стъпка." })
    .max(L.steps, { message: `Рецептата може да има най-много ${L.steps} стъпки.` }),
  tags: z.array(z.string()).refine((tags) => tags.every((tag) => (PREDEFINED_TAGS as unknown as string[]).includes(tag)), {
    message: "Има непознат етикет.",
  }).optional(),
  isPublic: z.boolean().default(true),
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;
