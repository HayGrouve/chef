import { v } from "convex/values";
import { internalMutation, MutationCtx } from "./_generated/server";

export type Quota = { limit: number; windowMs: number };

const MINUTE = 60 * 1000;

/** Background ingredient tagging (one Gemini call per recipe save). */
export const TAGGING_QUOTA: Quota = { limit: 30, windowMs: 60 * MINUTE };
/** Outbound page and image fetches made by recipe import. */
export const IMPORT_FETCH_QUOTA: Quota = { limit: 20, windowMs: 10 * MINUTE };

/**
 * Fixed-window counter: allows `limit` calls per `windowMs` per user and
 * action. Mutations are serializable, so concurrent calls can't overspend.
 */
export async function takeQuota(
  ctx: MutationCtx,
  userId: string,
  action: string,
  { limit, windowMs }: Quota
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action", (q) => q.eq("userId", userId).eq("action", action))
    .first();

  // lastCalledAt holds the start of the current window
  if (!row || now - row.lastCalledAt >= windowMs) {
    if (row) await ctx.db.patch(row._id, { lastCalledAt: now, count: 1 });
    else await ctx.db.insert("rateLimits", { userId, action, lastCalledAt: now, count: 1 });
    return { ok: true };
  }
  const count = row.count ?? 1;
  if (count >= limit) {
    return { ok: false, retryAfterMs: row.lastCalledAt + windowMs - now };
  }
  await ctx.db.patch(row._id, { count: count + 1 });
  return { ok: true };
}

/** `takeQuota` for actions, which can't touch the database directly. */
export const consume = internalMutation({
  args: { userId: v.string(), action: v.string(), limit: v.number(), windowMs: v.number() },
  handler: (ctx, { userId, action, limit, windowMs }) =>
    takeQuota(ctx, userId, action, { limit, windowMs }),
});
