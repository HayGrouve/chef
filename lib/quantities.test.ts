import { describe, expect, test } from "vitest";
import {
  formatIngredients,
  parseAmounts,
  renderLine,
  sanitizeAmounts,
  type Amount,
  type UnitSystem,
} from "./quantities";

const at = (line: string, scale: number, system: UnitSystem = "original") =>
  renderLine(line, parseAmounts(line), { scale, system });

// Lines below are taken from real recipes in the app
describe("scaling with the parser", () => {
  test.each([
    ["600g chicken thighs, cut into chunks", 0.5, "300g chicken thighs, cut into chunks"],
    ["1/4 tsp salt", 0.5, "⅛ tsp salt"],
    ["3 tbsp soy sauce", 0.5, "1½ tbsp soy sauce"],
    ["2-3 зърна бахър", 3, "6-9 зърна бахър"],
    ["1 - 2 с.л. ориз", 2, "2 - 4 с.л. ориз"],
  ])("%s × %s", (line, scale, expected) => {
    expect(at(line, scale)).toBe(expected);
  });

  test("finds amounts after the name, as Bulgarian recipes write them", () => {
    expect(at("кайма - 250 г + 1 - 2 с.л. суров ориз", 2)).toBe("кайма - 500 г + 2 - 4 с.л. суров ориз");
    expect(at("яйца - 2 бр.", 3)).toBe("яйца - 6 бр.");
    expect(at("магданоз - 1/2 връзка", 3)).toBe("магданоз - 1½ връзки");
  });

  test("keeps metric amounts whole and moves between g and kg", () => {
    expect(at("125 грама краве масло", 0.5)).toBe("63 грама краве масло");
    expect(at("1kg ground beef", 0.5)).toBe("500g ground beef");
    expect(at("800г свинско месо", 3)).toBe("2,4кг свинско месо");
    expect(at("1.2 liters vegetable stock", 0.5)).toBe("600 ml vegetable stock");
    expect(at("5g citric acid", 0.5)).toBe("2.5g citric acid");
  });

  test("doesn't split eggs, cloves or bay leaves", () => {
    expect(at("1 egg", 0.5)).toBe("1 egg");
    expect(at("3 Eggs", 0.5)).toBe("2 Eggs");
    expect(at("3 bay leaves", 0.5)).toBe("2 bay leaves");
    expect(at("2 cloves garlic, minced", 0.5)).toBe("1 clove garlic, minced");
  });

  test("matches the unit to the number", () => {
    expect(at("1 cup Quinoa", 3)).toBe("3 cups Quinoa");
    expect(at("2 cups of flour", 0.5)).toBe("1 cup of flour");
    expect(at("1 чаена чаша брашно", 3)).toBe("3 чаени чаши брашно");
    expect(at("2 скилидки чесън", 0.5)).toBe("1 скилидка чесън");
    expect(at("1/2 a cup of oil", 3)).toBe("1½ cups of oil");
  });

  test("scales restated amounts but not package sizes", () => {
    expect(at("1½ cups (360mL) heavy whipping cream", 0.5)).toBe("¾ cup (180mL) heavy whipping cream");
    expect(at("1 can of corn (400g)", 3)).toBe("3 cans of corn (400g)");
    expect(at("3 cans of tuna in olive oil(3x160g)", 0.5)).toBe("1½ cans of tuna in olive oil(3x160g)");
    expect(at("2 (7-oz/200g) packages ladyfingers", 0.5)).toBe("1 (7-oz/200g) packages ladyfingers");
  });

  test("leaves lines without amounts alone", () => {
    for (const line of ["Salt to taste", "Kale", "смлян черен пипер на вкус", "70% dark chocolate"]) {
      expect(at(line, 2)).toBe(line);
    }
  });
});

describe("metric", () => {
  test("converts spoons and cups to millilitres", () => {
    expect(at("2 tbsp olive oil", 1, "metric")).toBe("30 ml olive oil");
    expect(at("оцет - 1 с.л.", 1, "metric")).toBe("оцет - 15 мл");
    expect(at("1 ч.ч. вино", 2, "metric")).toBe("400 мл вино");
    expect(at("5 cups of broth", 1, "metric")).toBe("1.2 l of broth");
  });

  test("uses the recipe's own metric figure and drops the duplicate", () => {
    expect(at("3 Tbsp (38g) granulated sugar", 1, "metric")).toBe("38 g granulated sugar");
    expect(at("1½ cups (360mL) heavy whipping cream", 2, "metric")).toBe("720 ml heavy whipping cream");
  });

  test("leaves metric and counted amounts as they are", () => {
    expect(at("200g feta cheese", 1, "metric")).toBe("200g feta cheese");
    expect(at("2 cloves garlic", 1, "metric")).toBe("2 cloves garlic");
  });
});

describe("AI-marked amounts", () => {
  const cupsOfFlour: Amount[] = [
    { text: "2 cups", value: 2, unit: "cups", one: "cup", other: "cups", split: "any", metric: { value: 240, unit: "g" } },
  ];

  test("uses the AI's grams for metric", () => {
    const { lines, canConvert } = formatIngredients(["2 cups flour"], [cupsOfFlour], { scale: 0.5, system: "metric" });
    expect(lines).toEqual(["120 g flour"]);
    expect(canConvert).toBe(true);
  });

  test("inflects counted nouns", () => {
    const line = "лук - 1 средна глава";
    const amounts = sanitizeAmounts(line, [
      { text: "1 средна глава", value: 1, unit: "средна глава", one: "средна глава", other: "средни глави", split: "half" },
    ]);
    expect(renderLine(line, amounts!, { scale: 3, system: "original" })).toBe("лук - 3 средни глави");
  });

  test("falls back to the parser where the AI's reading doesn't match the line", () => {
    const lines = ["250g butter", "3 eggs"];
    const stored = [
      sanitizeAmounts(lines[0], [{ text: "250 g", value: 250 }]), // not in the line
      sanitizeAmounts(lines[1], [{ text: "3 eggs", value: 4 }]), // wrong number
    ];
    expect(stored).toEqual([null, null]);
    expect(formatIngredients(lines, stored, { scale: 2, system: "original" }).lines).toEqual([
      "500g butter",
      "6 eggs",
    ]);
  });

  test("ignores stored amounts that no longer line up with the ingredients", () => {
    const { lines } = formatIngredients(["1 cup sugar", "2 eggs"], [cupsOfFlour], { scale: 1, system: "metric" });
    expect(lines).toEqual(["240 ml sugar", "2 eggs"]);
  });

  test("drops a metric weight on a counted item", () => {
    const amounts = sanitizeAmounts("1 egg", [{ text: "1 egg", value: 1, unit: "egg", metric: { value: 50, unit: "g" } }]);
    expect(amounts?.[0].metric).toBeUndefined();
  });
});

describe("AI-marked edge cases", () => {
  test("a slash restatement is dropped in metric", () => {
    const line = "2 (7-oz/200g) packages ladyfingers";
    const amounts = sanitizeAmounts(line, [
      { text: "2", value: 2, split: "whole" },
      { text: "7-oz", value: 7, unit: "oz", fixed: true, metric: { value: 200, unit: "g" } },
      { text: "200g", value: 200, unit: "g", fixed: true },
    ]);
    expect(renderLine(line, amounts!, { scale: 1, system: "metric" })).toBe("2 (200 g) packages ladyfingers");
    expect(renderLine(line, amounts!, { scale: 2, system: "original" })).toBe("4 (7-oz/200g) packages ladyfingers");
  });

  test("known units pluralize even without forms from the AI", () => {
    const line = "1/2 a cup of oil";
    const amounts = sanitizeAmounts(line, [{ text: "1/2 a cup", value: 0.5, unit: "cup" }]);
    expect(renderLine(line, amounts!, { scale: 3, system: "original" })).toBe("1½ cups of oil");
  });
});

test("rejects AI spans that cut through brackets, and drops articles from units", () => {
  expect(sanitizeAmounts("2 (7-oz/200g) packages", [{ text: "200g) packages", value: 200 }])).toBeNull();
  const line = "1/2 a cup of oil";
  const amounts = sanitizeAmounts(line, [{ text: "1/2 a cup", value: 0.5, unit: "a cup", one: "cup", other: "cups" }]);
  expect(renderLine(line, amounts!, { scale: 3, system: "original" })).toBe("1½ cups of oil");
});
