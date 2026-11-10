import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("the issuer comes from CLERK_JWT_ISSUER_DOMAIN, as customJwt", async () => {
  vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", "https://clerk.example.com");
  const { default: config } = await import("./auth.config");
  expect(config.providers).toEqual([
    {
      type: "customJwt",
      issuer: "https://clerk.example.com",
      jwks: "https://clerk.example.com/.well-known/jwks.json",
      algorithm: "RS256",
      applicationID: "convex",
    },
  ]);
});

test("an unset issuer fails the push instead of trusting nothing", async () => {
  vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", "");
  await expect(import("./auth.config")).rejects.toThrow("CLERK_JWT_ISSUER_DOMAIN");
});
