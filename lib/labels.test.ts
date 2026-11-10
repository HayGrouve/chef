import { describe, expect, it } from "vitest";
import { PREDEFINED_TAGS } from "./constants";
import { categoryKeywords } from "../convex/categories";
import {
  AISLE_LABELS,
  aisleLabel,
  dayLabel,
  difficultyLabel,
  mealTypeLabel,
  tagLabel,
} from "./labels";

describe("labels", () => {
  it("labels every predefined tag and every aisle", () => {
    for (const tag of PREDEFINED_TAGS) expect(tagLabel(tag)).not.toBe(tag);
    for (const aisle of [...Object.keys(categoryKeywords), "Other"]) {
      expect(AISLE_LABELS[aisle]).toBeTruthy();
    }
  });

  it("shows stored English keys in Bulgarian", () => {
    expect(difficultyLabel("Easy")).toBe("Лесно");
    expect(tagLabel("Quick & Easy")).toBe("Бързо и лесно");
    expect(aisleLabel("Meat & Seafood")).toBe("Месо и риба");
    expect(mealTypeLabel("dinner")).toBe("Вечеря");
    expect(mealTypeLabel("Dinner")).toBe("Вечеря");
    expect(dayLabel("Monday")).toBe("Понеделник");
  });

  it("leaves values without a label as they are", () => {
    expect(tagLabel("Grandma's")).toBe("Grandma's");
    expect(tagLabel("toString")).toBe("toString");
    expect(aisleLabel("Deli")).toBe("Deli");
  });
});
