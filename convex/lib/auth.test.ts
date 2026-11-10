/// <reference types="vite/client" />
import type { UserIdentity } from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import schema from "../schema";
import { getIdentity, getUserId, requireUserId } from "./auth";

const modules = import.meta.glob("../**/*.ts");

const IDENTITY = {
  subject: "user_123",
  issuer: "https://clerk.example.com",
  tokenIdentifier: "https://clerk.example.com|user_123",
} satisfies UserIdentity;

// Runs `fn` with a real Convex ctx signed in as `identity` (or signed out)
function as<T>(identity: UserIdentity | null, fn: (ctx: Parameters<typeof getIdentity>[0]) => Promise<T>) {
  const t = convexTest(schema, modules);
  // A wrapper, so `run`'s second argument never reaches `fn`
  return (identity ? t.withIdentity(identity) : t).run((ctx) => fn(ctx));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("without CLERK_AUTHORIZED_PARTIES", () => {
  test("any identity passes, with or without azp", async () => {
    vi.stubEnv("CLERK_AUTHORIZED_PARTIES", "");
    expect(await as(IDENTITY, getIdentity)).toEqual(IDENTITY);
    expect(await as({ ...IDENTITY, azp: "https://elsewhere.example" }, getUserId)).toBe("user_123");
    expect(await as(IDENTITY, requireUserId)).toBe("user_123");
  });

  test("signed out reads as null and requireUserId throws", async () => {
    expect(await as(null, getIdentity)).toBeNull();
    expect(await as(null, getUserId)).toBeNull();
    await expect(as(null, requireUserId)).rejects.toThrow("Влез, за да продължиш.");
    await expect(as(null, (ctx) => requireUserId(ctx, "Sign in first."))).rejects.toThrow("Sign in first.");
  });
});

describe("with CLERK_AUTHORIZED_PARTIES", () => {
  const KUHNYATA = "https://kuhnyata.onovaza.com";

  test("a token minted here passes", async () => {
    vi.stubEnv("CLERK_AUTHORIZED_PARTIES", `https://onovaza.com, ${KUHNYATA}`);
    const identity = { ...IDENTITY, azp: KUHNYATA };
    expect(await as(identity, getUserId)).toBe("user_123");
    expect(await as(identity, requireUserId)).toBe("user_123");
  });

  test("a token with another or no azp reads as signed out", async () => {
    vi.stubEnv("CLERK_AUTHORIZED_PARTIES", KUHNYATA);
    for (const identity of [{ ...IDENTITY, azp: "https://smetkata.onovaza.com" }, IDENTITY]) {
      expect(await as(identity, getIdentity)).toBeNull();
      expect(await as(identity, getUserId)).toBeNull();
      await expect(as(identity, requireUserId)).rejects.toThrow("Влез, за да продължиш.");
    }
  });
});
