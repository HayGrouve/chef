export const categoryKeywords: Record<string, string[]> = {
  "Produce": ["apple", "banana", "orange", "lettuce", "tomato", "onion", "garlic", "carrot", "pepper", "potato", "spinach", "fruit", "vegetable", "herb", "cilantro", "parsley", "basil", "lemon", "lime", "cucumber", "avocado"],
  "Dairy": ["milk", "cheese", "yogurt", "butter", "cream", "egg", "cheddar", "mozzarella", "parmesan", "curd", "ghee"],
  "Meat & Seafood": ["chicken", "beef", "pork", "fish", "salmon", "shrimp", "tuna", "steak", "bacon", "sausage", "ham", "lamb", "turkey"],
  "Grains & Pasta": ["rice", "pasta", "noodle", "bread", "flour", "oat", "quinoa", "spaghetti", "macaroni", "tortilla", "cereal"],
  "Canned & Jarred": ["can", "jar", "sauce", "bean", "soup", "broth", "stock", "paste", "tuna canned", "chickpea"],
  "Baking & Spices": ["sugar", "salt", "pepper", "oil", "vinegar", "spice", "baking", "powder", "soda", "vanilla", "cinnamon", "honey", "syrup"],
  "Frozen": ["frozen", "ice cream", "pizza frozen"],
  "Beverages": ["water", "soda", "juice", "coffee", "tea", "wine", "beer", "drink"],
  "Household": ["paper", "soap", "cleaner", "detergent", "foil", "wrap", "bag"],
};

export function getCategory(item: string): string {
  const lowerItem = item.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerItem.includes(keyword))) {
      return category;
    }
  }
  
  return "Other";
}
