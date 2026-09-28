import { Doc } from "./_generated/dataModel";

/** A recipe is readable by its owner, or by anyone when it's public. */
export function canReadRecipe(
  recipe: Doc<"recipes"> | null,
  userId: string | undefined
): recipe is Doc<"recipes"> {
  return !!recipe && (recipe.isPublic === true || recipe.userId === userId);
}
