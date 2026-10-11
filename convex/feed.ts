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

/**
 * Bytes a whole-catalogue read may use. Convex stops a function after 16 MiB
 * read, and a single maximum-size recipe is ~250 KB, so a row cap alone isn't
 * enough.
 */
export const READ_BYTES_BUDGET = 4 * 1024 * 1024;

/** Takes rows from a stream until the row cap or the byte budget runs out. */
export async function takeWithinBudget<T>(
  rows: AsyncIterable<T | null | undefined>,
  maxRows = READABLE_RECIPES_LIMIT,
  maxBytes = READ_BYTES_BUDGET
): Promise<T[]> {
  const taken: T[] = [];
  let bytes = 0;
  for await (const row of rows) {
    // Filtered streams yield null for the rows they skip
    if (row == null) continue;
    // Approximate document size; close enough to stay well under the limit
    bytes += JSON.stringify(row).length;
    if (bytes > maxBytes) break;
    taken.push(row);
    if (taken.length >= maxRows) break;
  }
  return taken;
}

/**
 * Rows a single feed page may read, including ones filters skip, before it
 * returns short (the client then offers "Load more"). Stream pagination can't
 * cap bytes, so this keeps a page of maximum-size recipes under 16 MiB.
 */
export const FEED_MAX_ROWS_READ = 40;
