/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { IMPORT_FETCH_QUOTA, TAGGING_QUOTA, takeQuota } from "./rateLimit";

const modules = import.meta.glob("./**/*.ts");
const USER = { subject: "user_a", name: "A", tokenIdentifier: "test|user_a" };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("quota allows `limit` calls per window, then resets", async () => {
  const t = convexTest(schema, modules);
  const quota = { limit: 2, windowMs: 60_000 };
  const take = () => t.run((ctx) => takeQuota(ctx, "u", "thing", quota));

  expect((await take()).ok).toBe(true);
  expect((await take()).ok).toBe(true);
  const refused = await take();
  expect(refused.ok).toBe(false);
  expect(!refused.ok && refused.retryAfterMs).toBeGreaterThan(0);

  vi.advanceTimersByTime(60_000);
  expect((await take()).ok).toBe(true);
});

test("background ingredient tagging (a Gemini call) is capped per user", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity(USER);
  for (let i = 0; i <= TAGGING_QUOTA.limit; i++) {
    await user.mutation(api.recipes.create, {
      title: `Soup ${i}`,
      description: "Warm soup",
      ingredients: ["water"],
      steps: ["Boil"],
      storageId: "",
    });
  }
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  // Every recipe saved, but one past the quota wasn't sent for tagging
  expect(scheduled).toHaveLength(TAGGING_QUOTA.limit);
  expect(await t.run(async (ctx) => (await ctx.db.query("recipes").collect()).length)).toBe(
    TAGGING_QUOTA.limit + 1
  );
});

test("import refuses to fetch once the user's fetch quota is spent", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("rateLimits", {
      userId: USER.subject,
      action: "importFetch",
      lastCalledAt: Date.now(),
      count: IMPORT_FETCH_QUOTA.limit,
    })
  );
  // Rejected before any network request is made
  await expect(
    t.withIdentity(USER).action(api.importRecipe.fromUrl, { url: "https://example.com/recipe" })
  ).rejects.toThrow(/Rate limit exceeded/);
});
