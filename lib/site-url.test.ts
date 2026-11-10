import { describe, expect, it } from "vitest";
import { siteUrl } from "./site-url";

describe("siteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL without a trailing slash", () => {
    expect(
      siteUrl({ NEXT_PUBLIC_SITE_URL: "https://kuhnyata.onovaza.com/", VERCEL_PROJECT_PRODUCTION_URL: "armyant.app" })
    ).toBe("https://kuhnyata.onovaza.com");
  });

  it("falls back to Vercel's production domain, then localhost", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "armyant.app" })).toBe("https://armyant.app");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: " " })).toBe("http://localhost:3000");
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});
