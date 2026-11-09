import { describe, expect, test } from "vitest";
import { signInReturnUrl } from "./sign-in-redirect";

const ORIGIN = "https://armyant.app";

describe("signInReturnUrl", () => {
  test("a relative target becomes absolute on this origin", () => {
    expect(signInReturnUrl("/create", ORIGIN)).toBe("https://armyant.app/create");
    expect(signInReturnUrl("/recipe/abc/cook?servings=2", ORIGIN)).toBe(
      "https://armyant.app/recipe/abc/cook?servings=2"
    );
  });

  test("an absolute same-origin target is kept", () => {
    expect(signInReturnUrl("https://armyant.app/meal-planner", ORIGIN)).toBe("https://armyant.app/meal-planner");
  });

  test("off-site targets are dropped", () => {
    expect(signInReturnUrl("https://evil.example/create", ORIGIN)).toBe("https://armyant.app/");
    expect(signInReturnUrl("//evil.example/create", ORIGIN)).toBe("https://armyant.app/");
    expect(signInReturnUrl("javascript:alert(1)", ORIGIN)).toBe("https://armyant.app/");
  });

  test("no target means the start page", () => {
    expect(signInReturnUrl(null, ORIGIN)).toBe("https://armyant.app/");
  });
});
