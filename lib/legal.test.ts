import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("legal pages", () => {
  it("308 to Кухнята's sections on the hub, anchor kept", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/privacy", destination: "https://onovaza.com/poveritelnost#kuhnyata", permanent: true },
        { source: "/terms", destination: "https://onovaza.com/usloviya#kuhnyata", permanent: true },
      ])
    );
  });
});
