/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import { RATE_LIMIT_RETENTION_MS, WEBHOOK_EVENT_RETENTION_MS } from "./cleanup";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("the daily trim drops rate-limit counters older than a day and keeps recent ones", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  await t.run(async (ctx) => {
    for (let i = 0; i < 250; i++) {
      await ctx.db.insert("rateLimits", { userId: `user_${i}`, action: "aiCalls", lastCalledAt: now - RATE_LIMIT_RETENTION_MS - 1000 });
    }
    await ctx.db.insert("rateLimits", { userId: "user_recent", action: "aiCalls", lastCalledAt: now - 60_000 });
  });

  await t.mutation(internal.cleanup.trimRateLimits, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const left = await t.run((ctx) => ctx.db.query("rateLimits").collect());
  expect(left.map((row) => row.userId)).toEqual(["user_recent"]);
});

test("the daily trim forgets webhook deliveries older than a month", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.insert("processedWebhookEvents", { eventId: "msg_old", processedAt: now - WEBHOOK_EVENT_RETENTION_MS - 1000 });
    await ctx.db.insert("processedWebhookEvents", { eventId: "msg_new", processedAt: now - 1000 });
  });

  expect(await t.mutation(internal.cleanup.trimWebhookEvents, {})).toBe(1);
  const left = await t.run((ctx) => ctx.db.query("processedWebhookEvents").collect());
  expect(left.map((row) => row.eventId)).toEqual(["msg_new"]);
});
