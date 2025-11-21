import { v } from "convex/values";

// Shared category keywords for shopping list classification
export const categoryKeywords: Record<string, string[]> = {
  Produce: [
    "apple",
    "banana",
    "orange",
    "lettuce",
    "tomato",
    "onion",
    "garlic",
    "carrot",
    "pepper",
    "potato",
    "spinach",
    "fruit",
    "vegetable",
    "herb",
    "cilantro",
    "parsley",
    "basil",
    "lemon",
    "lime",
    "cucumber",
    "avocado",
  ],
  Dairy: [
    "milk",
    "cheese",
    "yogurt",
    "butter",
    "cream",
    "egg",
    "cheddar",
    "mozzarella",
    "parmesan",
    "curd",
    "ghee",
  ],
  "Meat & Seafood": [
    "chicken",
    "beef",
    "pork",
    "fish",
    "salmon",
    "shrimp",
    "tuna",
    "steak",
    "bacon",
    "sausage",
    "ham",
    "lamb",
    "turkey",
  ],
  "Grains & Pasta": [
    "rice",
    "pasta",
    "noodle",
    "bread",
    "flour",
    "oat",
    "quinoa",
    "spaghetti",
    "macaroni",
    "tortilla",
    "cereal",
  ],
  "Canned & Jarred": [
    "can",
    "jar",
    "sauce",
    "bean",
    "soup",
    "broth",
    "stock",
    "paste",
    "tuna canned",
    "chickpea",
  ],
  "Baking & Spices": [
    "sugar",
    "salt",
    "pepper",
    "oil",
    "vinegar",
    "spice",
    "baking",
    "powder",
    "soda",
    "vanilla",
    "cinnamon",
    "honey",
    "syrup",
  ],
  Frozen: ["frozen", "ice cream", "pizza frozen"],
  Beverages: ["water", "soda", "juice", "coffee", "tea", "wine", "beer", "drink"],
  Household: ["paper", "soap", "cleaner", "detergent", "foil", "wrap", "bag"],
};

/**
 * Very small, server-safe parser to strip leading quantity and unit,
 * similar in spirit to `lib/shoppingUtils.ts::parseIngredient`, but
 * implemented locally so Convex code does not depend on client bundles.
 *
 * Examples:
 * - "2 cups milk"      -> "milk"
 * - "1/2 tsp salt"     -> "salt"
 * - "3 large tomatoes" -> "tomatoes"
 */
export function extractItemName(raw: string): string {
  const text = raw.trim().toLowerCase();

  // Matches leading number or fraction + optional unit, then the rest
  const match = text.match(/^([\d./]+)\s+([a-zA-Z]+)?\s+(.+)$/);
  if (match) {
    const [, , , itemPart] = match;
    return itemPart.trim();
  }

  // Fallback: just return the whole string lowercased
  return text;
}

export function getCategory(rawIngredient: string): string {
  const item = extractItemName(rawIngredient);

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => item.includes(keyword))) {
      return category;
    }
  }

  return "Other";
}


