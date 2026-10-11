import { mergedStream, stream } from "convex-helpers/server/stream";
import { QueryCtx } from "./_generated/server";
import schema from "./schema";

/**
 * Recipes a caller may read, newest first, read through indexes instead of
 * scanning the table: public recipes, plus the caller's own private ones.
 *
 * Paginating this stream needs `endCursor` pinning on the client, so use
 * `usePaginatedQuery` from `convex-helpers/react` for queries built on it.
 */
export function readableRecipes(ctx: QueryCtx, userId: string | undefined) {
  const recipes = stream(ctx.db, schema).query("recipes");
  const publicRecipes = recipes
    .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
    .order("desc");
  if (!userId) return publicRecipes;
  const ownPrivate = stream(ctx.db, schema)
    .query("recipes")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .order("desc")
    // Their public recipes already come from the public stream
    .filterWith(async (recipe) => recipe.isPublic !== true);
  return mergedStream([publicRecipes, ownPrivate], ["_creationTime"]);
}

/** The caller's own recipes, newest first. */
export function ownRecipes(ctx: QueryCtx, userId: string) {
  return stream(ctx.db, schema)
    .query("recipes")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .order("desc");
}

/**
 * Upper bound for queries that need every readable recipe at once (the planner
 * picker, pantry search, auto-fill), so they stay within Convex read limits as
 * the public catalogue grows. The newest recipes win.
 */
export const READABLE_RECIPES_LIMIT = 1000;

/** Rows a single feed page may scan past filters before returning short. */
export const FEED_MAX_ROWS_READ = 2000;
