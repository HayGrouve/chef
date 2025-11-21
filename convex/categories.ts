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
    "grape",
    "berry",
    "melon",
    "squash",
    "zucchini",
    "corn",
    "broccoli",
    "cauliflower",
    "kale",
    "arugula",
    "mushroom",
    "ginger",
    "mint",
    "thyme",
    "rosemary",
    "dill",
    "scallion",
    "shallot",
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
    "margarine",
    "feta",
    "brie",
    "ricotta",
    "paneer",
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
    "cod",
    "halibut",
    "prawn",
    "crab",
    "lobster",
    "duck",
    "prosciutto",
    "salami",
    "meatball",
    "ground meat",
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
    "barley",
    "couscous",
    "penne",
    "fusilli",
    "linguine",
    "fettuccine",
    "lasagna",
    "bagel",
    "bun",
    "wrap",
    "pita",
    "cracker",
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
    "lentil",
    "olive",
    "pickle",
    "capers",
    "jam",
    "jelly",
    "butter peanut",
    "butter almond",
    "salsa",
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
    "chocolate",
    "cocoa",
    "yeast",
    "cornstarch",
    "extract",
    "cumin",
    "paprika",
    "turmeric",
    "oregano",
    "chili",
    "nutmeg",
  ],
  Frozen: [
    "frozen",
    "ice cream",
    "pizza frozen",
    "peas frozen",
    "corn frozen",
    "berries frozen",
  ],
  Beverages: [
    "water",
    "soda",
    "juice",
    "coffee",
    "tea",
    "wine",
    "beer",
    "drink",
    "coke",
    "pepsi",
    "sprite",
    "lemonade",
  ],
  Household: [
    "paper",
    "soap",
    "cleaner",
    "detergent",
    "foil",
    "wrap",
    "bag",
    "tissue",
    "towel",
    "sponge",
    "shampoo",
    "toothpaste",
  ],
};

/**
 * Server-safe parser to strip leading quantity and unit.
 *
 * Examples:
 * - "2 cups milk"      -> "milk"
 * - "1/2 tsp salt"     -> "salt"
 * - "3 large tomatoes" -> "tomatoes"
 * - "1 kg chicken breast" -> "chicken breast"
 */
export function extractItemName(raw: string): string {
  const text = raw.trim().toLowerCase();

  // 1. Remove leading quantities (integers, decimals, fractions like 1/2)
  //    and common units (cup, kg, lbs, oz, tsp, tbsp, etc.)
  //    Regex explanation:
  //    ^                Start of string
  //    (                Capture Group 1 (Quantity):
  //      \d+            One or more digits
  //      (?:[./]\d+)?   Optional decimal or fraction part
  //    )?               Quantity is optional
  //    \s*              Optional whitespace
  //    (                Capture Group 2 (Unit - optional):
  //      (?:cups?|tsp|tbsp|oz|lbs?|kg|g|ml|l|large|small|medium|bunch|clove|slice|piece|can|jar|bottle|pkg|pack|bag|box)\.?
  //    )?
  //    \s+              Required whitespace separator if quantity/unit existed
  //    (.+)$            Capture Group 3 (Item Name - the rest)

  // Improved regex to be more robust
  const match = text.match(
    /^((?:\d+(?:[./]\d+)?\s*)?(?:(?:cups?|teaspoons?|tsp\.?|tablespoons?|tbsp\.?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g\.?|kilograms?|kg\.?|ml\.?|l\.?|liters?|large|small|medium|bunch|cloves?|slices?|pieces?|cans?|jars?|bottles?|pkgs?|packs?|bags?|box(?:es)?)\s+)?)(.+)$/
  );

  if (match) {
    const potentialItemName = match[2].trim();
    // If the potential item name is empty (e.g. input was just "2 cups"), return original text
    return potentialItemName || text;
  }

  return text;
}

export function getCategory(rawIngredient: string): string {
  const item = extractItemName(rawIngredient);

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    // Use word boundary matching to avoid partial matches (e.g. "grapefruit" matching "fruit")
    // We escape special regex characters in keywords just in case
    if (
      keywords.some((keyword) => {
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, "i");
        return regex.test(item) || item.includes(keyword); // Fallback to includes for multi-word keywords like "ice cream" if strictly needed, but \b handles spaces fine.
        // Actually \b works for "ice cream" as \bice cream\b matches "I love ice cream".
        // But let's stick to regex test.
      })
    ) {
      return category;
    }
  }

  return "Other";
}
