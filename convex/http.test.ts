/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { Webhook } from "standardwebhooks";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const secret = "whsec_" + btoa("clerk-endpoint-secret-for-tests");
const userId = "user_gone";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** A `user.deleted` delivery signed like Svix does (Standard Webhooks). */
function delivery(id: string, signingSecret = secret) {
  const body = JSON.stringify({ type: "user.deleted", object: "event", data: { id: userId, object: "user", deleted: true } });
  const now = new Date();
  return {
    method: "POST",
    body,
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(now.getTime() / 1000)),
      "svix-signature": new Webhook(signingSecret).sign(id, now, body),
    },
  };
}

async function setup() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("users", { name: "Гошо", tokenIdentifier: `test|${userId}`, userId });
    await ctx.db.insert("rateLimits", { userId, action: "aiCalls", lastCalledAt: Date.now(), count: 1 });
  });
  const rows = () =>
    t.run(async (ctx) => ({
      users: (await ctx.db.query("users").collect()).length,
      rateLimits: (await ctx.db.query("rateLimits").collect()).length,
      events: (await ctx.db.query("processedWebhookEvents").collect()).length,
    }));
  return { t, rows };
}

test("answers 503 and erases nothing while the signing secret is unset", async () => {
  const { t, rows } = await setup();
  const response = await t.fetch("/clerk/webhook", delivery("msg_1"));
  expect(response.status).toBe(503);
  expect(await rows()).toEqual({ users: 1, rateLimits: 1, events: 0 });
});

test("rejects a delivery not signed with the endpoint secret", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", secret);
  const { t, rows } = await setup();
  const response = await t.fetch("/clerk/webhook", delivery("msg_1", "whsec_" + btoa("someone-else")));
  expect(response.status).toBe(400);
  expect(await rows()).toEqual({ users: 1, rateLimits: 1, events: 0 });
});

test("a signed user.deleted erases the person and their counters; a repeated svix-id is ignored", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", secret);
  const { t, rows } = await setup();

  expect((await t.fetch("/clerk/webhook", delivery("msg_1"))).status).toBe(200);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await rows()).toEqual({ users: 0, rateLimits: 0, events: 1 });

  // The person signs in again before Svix repeats the old delivery
  await t.run((ctx) => ctx.db.insert("users", { name: "Гошо", tokenIdentifier: `test|${userId}`, userId }));
  expect((await t.fetch("/clerk/webhook", delivery("msg_1"))).status).toBe(200);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await rows()).toEqual({ users: 1, rateLimits: 0, events: 1 });
});
