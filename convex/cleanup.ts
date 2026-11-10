// Daily trims of bookkeeping rows nobody needs after a while.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;
/** The longest rate-limit window is an hour, so a day-old counter limits nothing. */
export const RATE_LIMIT_RETENTION_MS = DAY_MS;
/** Svix retries a delivery for a few days; a month covers every repeat. */
export const WEBHOOK_EVENT_RETENTION_MS = 30 * DAY_MS;
const BATCH = 200;

/** Deletes rate-limit counters last used more than a day ago. */
export const trimRateLimits = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("rateLimits")
      .withIndex("by_lastCalledAt", (q) => q.lt("lastCalledAt", Date.now() - RATE_LIMIT_RETENTION_MS))
      .take(BATCH);
    for (const row of stale) await ctx.db.delete(row._id);
    if (stale.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.cleanup.trimRateLimits, {});
    }
    return stale.length;
  },
});

/** Forgets Clerk webhook deliveries handled more than a month ago. */
export const trimWebhookEvents = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const old = await ctx.db
      .query("processedWebhookEvents")
      .withIndex("by_processedAt", (q) => q.lt("processedAt", Date.now() - WEBHOOK_EVENT_RETENTION_MS))
      .take(BATCH);
    for (const event of old) await ctx.db.delete(event._id);
    if (old.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.cleanup.trimWebhookEvents, {});
    }
    return old.length;
  },
});
