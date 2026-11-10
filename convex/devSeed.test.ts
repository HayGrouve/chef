/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  // Profiles no longer keep an email, so the test user is found by id alone
  await t.run((ctx) => ctx.db.insert("users", { name: "QA", tokenIdentifier: "test|user_qa", userId: "user_qa" }));
  return t;
}

test("the dev seed refuses on any deployment but dev", async () => {
  const t = await setup();
  vi.stubEnv("CONVEX_CLOUD_URL", "https://descriptive-snail-667.convex.cloud");
  await expect(t.mutation(internal.devSeed.seedTestUser, { userId: "user_qa" })).rejects.toThrow(/dev deployment/);
});

test("the dev seed fills a signed-in test user's Кухнята on dev", async () => {
  const t = await setup();
  vi.stubEnv("CONVEX_CLOUD_URL", "https://hearty-kookabura-538.convex.cloud");
  await expect(t.mutation(internal.devSeed.seedTestUser, { userId: "user_nobody" })).rejects.toThrow(/Sign in once/);
  expect(await t.mutation(internal.devSeed.seedTestUser, { userId: "user_qa" })).toEqual({ recipes: 9, meals: 10 });
});
