import { mutation } from "./_generated/server";

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // 1. Create Ghost Users
    const ghostUsers = [
      {
        name: "Chef Gordon",
        email: "gordon@example.com",
        tokenIdentifier: "ghost_gordon",
        userId: "ghost_user_1",
        bio: "I love cooking fast and loud.",
      },
      {
        name: "Julia C.",
        email: "julia@example.com",
        tokenIdentifier: "ghost_julia",
        userId: "ghost_user_2",
        bio: "Mastering the art of French cooking.",
      },
      {
        name: "Healthy Eats",
        email: "healthy@example.com",
        tokenIdentifier: "ghost_healthy",
        userId: "ghost_user_3",
        bio: "All about macros and micros.",
      },
    ];

    for (const u of ghostUsers) {
      // Check if user exists to avoid duplicates if run multiple times
      const existing = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", u.userId))
        .unique();
      if (!existing) {
        await ctx.db.insert("users", u);
      }
    }

    // 2. Create Dummy Recipes
    const dummyRecipes = [
      {
        userId: "ghost_user_1",
        authorName: "Chef Gordon",
        title: "Spicy Arrabbiata Pasta",
        description: "A quick and fiery pasta dish for those who love a kick.",
        ingredients: ["200g Pasta", "2 cups Tomato Sauce", "3 cloves Garlic", "Chili Flakes", "Olive Oil"],
        steps: ["Boil pasta.", "Fry garlic and chili in oil.", "Add tomato sauce and simmer.", "Toss pasta in sauce."],
        storageId: "",
        tags: ["Dinner", "Spicy", "Pasta"],
        isPublic: true,
        cookingTime: 20,
        difficulty: "Easy",
        calories: 450,
      },
      {
        userId: "ghost_user_1",
        authorName: "Chef Gordon",
        title: "Beef Wellington",
        description: "A classic, show-stopping centerpiece for any dinner party.",
        ingredients: ["1kg Beef Fillet", "Mushroom Duxelles", "Prosciutto", "Puff Pastry", "Egg Wash"],
        steps: ["Sear beef.", "Wrap in prosciutto and duxelles.", "Wrap in pastry.", "Bake until golden."],
        storageId: "",
        tags: ["Dinner", "Meat", "Fancy"],
        isPublic: true,
        cookingTime: 120,
        difficulty: "Hard",
        calories: 800,
      },
      {
        userId: "ghost_user_2",
        authorName: "Julia C.",
        title: "Classic French Omelette",
        description: "Soft, buttery, and perfectly folded.",
        ingredients: ["3 Eggs", "1 tbsp Butter", "Salt", "Pepper", "Chives"],
        steps: ["Whisk eggs.", "Melt butter in pan.", "Pour eggs and stir constantly.", "Fold and serve."],
        storageId: "",
        tags: ["Breakfast", "French", "Quick"],
        isPublic: true,
        cookingTime: 10,
        difficulty: "Medium",
        calories: 300,
      },
      {
        userId: "ghost_user_2",
        authorName: "Julia C.",
        title: "Coq au Vin",
        description: "Chicken braised with wine, lardons, and mushrooms.",
        ingredients: ["1 Whole Chicken", "1 bottle Red Wine", "Bacon Lardons", "Mushrooms", "Pearl Onions"],
        steps: ["Brown chicken and bacon.", "Add veggies.", "Pour in wine and simmer slowly for hours."],
        storageId: "",
        tags: ["Dinner", "French", "Slow Cook"],
        isPublic: true,
        cookingTime: 180,
        difficulty: "Hard",
        calories: 650,
      },
      {
        userId: "ghost_user_3",
        authorName: "Healthy Eats",
        title: "Quinoa Power Bowl",
        description: "Packed with protein and fresh veggies.",
        ingredients: ["1 cup Quinoa", "Roasted Chickpeas", "Kale", "Avocado", "Lemon Tahini Dressing"],
        steps: ["Cook quinoa.", "Roast chickpeas.", "Massage kale.", "Assemble bowl and drizzle dressing."],
        storageId: "",
        tags: ["Lunch", "Vegan", "Healthy"],
        isPublic: true,
        cookingTime: 30,
        difficulty: "Easy",
        calories: 400,
      },
      {
        userId: "ghost_user_3",
        authorName: "Healthy Eats",
        title: "Protein Pancakes",
        description: "Start your day with these fluffy, macro-friendly pancakes.",
        ingredients: ["1 scoop Protein Powder", "1 Banana", "2 Eggs", "Oats", "Cinnamon"],
        steps: ["Blend all ingredients.", "Cook on a non-stick pan.", "Serve with sugar-free syrup."],
        storageId: "",
        tags: ["Breakfast", "High Protein", "Sweet"],
        isPublic: true,
        cookingTime: 15,
        difficulty: "Easy",
        calories: 350,
      },
    ];

    let count = 0;
    for (const r of dummyRecipes) {
      // Check if recipe exists to avoid duplicates
      const existing = await ctx.db
        .query("recipes")
        .withIndex("by_userId", (q) => q.eq("userId", r.userId))
        .filter((q) => q.eq(q.field("title"), r.title))
        .first();

      if (!existing) {
        const searchText = `${r.title} ${r.authorName}`.toLowerCase();
        await ctx.db.insert("recipes", {
          ...r,
          searchText,
        });
        count++;
      }
    }

    return `Seeded ${count} new recipes and 3 ghost users.`;
  },
});