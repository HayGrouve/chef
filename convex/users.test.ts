/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// The profile row was stored under another token identifier (another issuer);
// only the Clerk user id (`subject`) matches.
async function setup() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("users", { name: "Мария", tokenIdentifier: "https://old-issuer|user_m", userId: "user_m" })
  );
  return { t, me: t.withIdentity({ subject: "user_m", tokenIdentifier: "https://new-issuer|user_m" }) };
}

test("getMe finds the profile by subject", async () => {
  const { t, me } = await setup();
  expect((await me.query(api.users.getMe, {}))?.name).toBe("Мария");
  expect(await t.query(api.users.getMe, {})).toBeNull();
});

test("update finds the profile by subject", async () => {
  const { me } = await setup();
  await me.mutation(api.users.update, { bio: "Готвя супи." });
  expect((await me.query(api.users.getMe, {}))?.bio).toBe("Готвя супи.");
});

test("store finds the profile by subject and adds no second row", async () => {
  const { t, me } = await setup();
  await me.mutation(api.users.store, {});
  const rows = await t.run((ctx) => ctx.db.query("users").collect());
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe("Мария");
});
