/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { ORPHAN_GRACE_MS } from "./storageCleanup";

const modules = import.meta.glob("./**/*.ts");
const USER = { subject: "user_a", name: "A", tokenIdentifier: "test|user_a" };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const recipe = {
  title: "Toast",
  description: "",
  ingredients: ["bread"],
  steps: ["toast it"],
  isPublic: false,
};

test("old uploads no recipe uses are deleted; recipe photos and recent uploads stay", async () => {
  const t = convexTest(schema, modules);
  const store = () => t.run((ctx) => ctx.storage.store(new Blob(["img"], { type: "image/png" })));
  const orphan = await store();
  const photo = await store();
  await t.withIdentity(USER).mutation(api.recipes.create, { ...recipe, storageId: photo });

  vi.setSystemTime(Date.now() + ORPHAN_GRACE_MS + 60_000);
  const recent = await store();

  const result = await t.mutation(internal.storageCleanup.deleteOrphanUploads, {});
  expect(result).toEqual({ deleted: 1, aborted: false });
  const remaining = await t.run(async (ctx) =>
    (await ctx.db.system.query("_storage").collect()).map((f) => f._id)
  );
  expect(remaining.sort()).toEqual([photo, recent].sort());
  expect(remaining).not.toContain(orphan);
});

test("cleanup deletes nothing if a recipe has a storage id it can't recognise", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) => ctx.storage.store(new Blob(["img"], { type: "image/png" })));
  await t.run((ctx) =>
    ctx.db.insert("recipes", { ...recipe, userId: "user_a", storageId: "legacy-uuid-1234" })
  );
  vi.setSystemTime(Date.now() + ORPHAN_GRACE_MS + 60_000);
  const result = await t.mutation(internal.storageCleanup.deleteOrphanUploads, {});
  expect(result).toEqual({ deleted: 0, aborted: true });
});
