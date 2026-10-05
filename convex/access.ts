import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

/** A recipe is readable by its owner, or by anyone when it's public. */
export function canReadRecipe(
  recipe: Doc<"recipes"> | null,
  userId: string | undefined
): recipe is Doc<"recipes"> {
  return !!recipe && (recipe.isPublic === true || recipe.userId === userId);
}

/** Only link list items to recipes the user can read; otherwise leave them unlinked. */
export async function readableRecipeId(
  ctx: QueryCtx,
  recipeId: Id<"recipes"> | undefined,
  userId: string
) {
  if (!recipeId) return undefined;
  return canReadRecipe(await ctx.db.get(recipeId), userId) ? recipeId : undefined;
}
