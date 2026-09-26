// PROTOTYPE — demo data for evaluating /prototype routes on the dev deployment.
//
//   npx convex run prototype/seed:seedTestUser '{"userId":"user_..."}'
//
// Only runs for Clerk test users (email contains "+clerk_test") so it can't
// touch a real account. Recipes are private to that user.
import { v, ConvexError } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

const RECIPES = [
  {
    title: "Weeknight Chicken Tikka Masala",
    description: "Charred, yogurt-marinated chicken in a creamy spiced tomato sauce. Faster than takeout.",
    ingredients: ["600g chicken thighs, cut into chunks", "150g plain yogurt", "2 tsp garam masala", "1 tsp ground cumin", "1 tsp smoked paprika", "2 tbsp butter", "1 onion, finely chopped", "3 cloves garlic, minced", "1 tbsp grated ginger", "400g crushed tomatoes", "150ml heavy cream", "1 bunch cilantro", "Salt to taste"],
    steps: ["Mix the yogurt, 1 tsp garam masala, cumin, paprika and a pinch of salt. Coat the chicken and marinate for 20 minutes.", "Heat a large pan over high heat and sear the chicken for 5-6 minutes until charred. Set aside.", "Lower the heat, melt the butter and cook the onion for 8 minutes until soft and golden.", "Add the garlic, ginger and remaining garam masala and cook for 1 minute until fragrant.", "Pour in the crushed tomatoes and simmer for 10 minutes.", "Stir in the cream and chicken and simmer for another 8 minutes until the chicken is cooked through.", "Season with salt and scatter with chopped cilantro. Serve with rice or naan."],
    cookingTime: 45, difficulty: "Medium", calories: 520, tags: ["Dinner", "Asian", "Comfort Food"],
  },
  {
    title: "Lemon Garlic Butter Salmon",
    description: "Crispy-skinned salmon with a glossy lemon garlic butter. Dinner in 20 minutes.",
    ingredients: ["4 salmon fillets, skin on", "1 tbsp olive oil", "3 tbsp butter", "4 cloves garlic, minced", "1 lemon, zested and juiced", "200g green beans", "1 tbsp chopped parsley", "Salt and black pepper"],
    steps: ["Pat the salmon dry and season with salt and pepper.", "Heat the olive oil in a skillet over medium-high heat. Cook the salmon skin-side down for 4 minutes without moving it.", "Flip and cook for 3 minutes more, then move to a plate.", "Add the green beans to the pan and cook for 5 minutes until bright green.", "Melt the butter with the garlic for 1 minute, then add the lemon zest and juice.", "Return the salmon, spoon the butter over it and finish with parsley."],
    cookingTime: 25, difficulty: "Easy", calories: 430, tags: ["Dinner", "Quick & Easy", "Healthy", "Gluten-Free"],
  },
  {
    title: "Shakshuka",
    description: "Eggs gently poached in a smoky pepper and tomato sauce. Best with crusty bread.",
    ingredients: ["2 tbsp olive oil", "1 onion, sliced", "1 red bell pepper, sliced", "2 cloves garlic, sliced", "1 tsp ground cumin", "1 tsp smoked paprika", "800g canned tomatoes", "6 eggs", "50g feta", "Fresh parsley", "Crusty bread, to serve"],
    steps: ["Heat the oil in a wide pan and cook the onion and pepper for 10 minutes until soft.", "Add the garlic, cumin and paprika and cook for 1 minute.", "Add the tomatoes, season, and simmer for 15 minutes until thickened.", "Make 6 wells in the sauce and crack an egg into each.", "Cover and cook for 6-8 minutes until the whites are set but the yolks are runny.", "Crumble over the feta, scatter with parsley and serve with bread."],
    cookingTime: 35, difficulty: "Easy", calories: 310, tags: ["Breakfast", "Vegetarian", "Mediterranean"],
  },
  {
    title: "Overnight Oats with Berries",
    description: "Creamy make-ahead oats for busy mornings.",
    ingredients: ["80g rolled oats", "200ml milk", "100g Greek yogurt", "1 tbsp chia seeds", "1 tbsp maple syrup", "100g mixed berries"],
    steps: ["Stir the oats, milk, yogurt, chia seeds and maple syrup together in a jar.", "Cover and refrigerate for at least 4 hours, or overnight.", "Top with the berries and serve cold."],
    cookingTime: 5, difficulty: "Easy", calories: 380, tags: ["Breakfast", "Healthy", "Vegetarian", "Quick & Easy"],
  },
  {
    title: "Classic Beef Chili",
    description: "A big pot of rich, smoky chili. Even better the next day.",
    ingredients: ["2 tbsp olive oil", "1kg ground beef", "2 onions, diced", "4 cloves garlic, minced", "2 tbsp chili powder", "2 tsp ground cumin", "1 tsp dried oregano", "2 tbsp tomato paste", "800g crushed tomatoes", "2 cans kidney beans, drained", "500ml beef stock", "1 tsp salt", "Sour cream and cheddar, to serve"],
    steps: ["Heat the oil in a large pot and brown the beef in batches, about 8 minutes. Remove and set aside.", "Cook the onions for 6 minutes until soft, then add the garlic for 1 minute.", "Stir in the chili powder, cumin, oregano and tomato paste and cook for 2 minutes.", "Return the beef and add the tomatoes, beans and stock. Bring to a boil.", "Lower the heat and simmer uncovered for 1 hour, stirring occasionally.", "Season with salt and serve with sour cream and cheddar."],
    cookingTime: 90, difficulty: "Medium", calories: 610, tags: ["Dinner", "Comfort Food", "Spicy", "American"],
  },
  {
    title: "Mushroom Risotto",
    description: "Silky, deeply savory risotto with browned mushrooms and parmesan.",
    ingredients: ["1.2 liters vegetable stock", "2 tbsp olive oil", "400g mixed mushrooms, sliced", "1 shallot, finely chopped", "2 cloves garlic, minced", "300g arborio rice", "120ml dry white wine", "40g butter", "60g parmesan, grated", "Salt and black pepper"],
    steps: ["Warm the stock in a saucepan and keep it at a gentle simmer.", "Fry the mushrooms in the oil over high heat for 6 minutes until browned. Set half aside.", "Add the shallot and garlic and cook for 3 minutes.", "Stir in the rice and toast it for 2 minutes.", "Pour in the wine and stir until absorbed.", "Add the stock a ladle at a time, stirring, for 18-20 minutes until the rice is creamy and just tender.", "Take off the heat, beat in the butter and parmesan, and rest for 2 minutes. Top with the reserved mushrooms."],
    cookingTime: 40, difficulty: "Medium", calories: 540, tags: ["Dinner", "Italian", "Vegetarian"],
  },
  {
    title: "Greek Salad Wraps",
    description: "Crunchy, tangy wraps with hummus, feta and a quick Greek salad.",
    ingredients: ["4 large tortillas", "150g hummus", "1 cucumber, diced", "200g cherry tomatoes, halved", "1/2 red onion, thinly sliced", "80g kalamata olives", "100g feta, crumbled", "1 tbsp olive oil", "1 tsp dried oregano"],
    steps: ["Toss the cucumber, tomatoes, onion, olives, olive oil and oregano in a bowl.", "Spread each tortilla with hummus.", "Pile on the salad and feta, then roll up tightly and cut in half."],
    cookingTime: 15, difficulty: "Easy", calories: 450, tags: ["Lunch", "Mediterranean", "Vegetarian", "Quick & Easy"],
  },
  {
    title: "Thai Peanut Noodles",
    description: "Cold sesame-peanut noodles with crunchy vegetables. Great for lunch boxes.",
    ingredients: ["250g rice noodles", "4 tbsp peanut butter", "3 tbsp soy sauce", "1 tbsp rice vinegar", "1 tbsp maple syrup", "1 lime, juiced", "1 tbsp grated ginger", "1 carrot, julienned", "1 red bell pepper, sliced", "2 spring onions, sliced", "2 tbsp roasted peanuts"],
    steps: ["Cook the noodles according to the package, about 6 minutes, then rinse under cold water.", "Whisk the peanut butter, soy sauce, vinegar, maple syrup, lime juice and ginger with 3 tbsp warm water.", "Toss the noodles with the sauce, carrot and pepper.", "Top with spring onions and chopped peanuts."],
    cookingTime: 20, difficulty: "Easy", calories: 490, tags: ["Lunch", "Asian", "Vegan", "Quick & Easy"],
  },
  {
    title: "Banana Bread",
    description: "Moist, one-bowl banana bread with a crackly top.",
    ingredients: ["3 ripe bananas", "80g melted butter", "150g brown sugar", "1 egg", "1 tsp vanilla extract", "1 tsp baking soda", "1/4 tsp salt", "190g all-purpose flour", "50g walnuts, chopped"],
    steps: ["Preheat the oven to 175°C and line a loaf tin.", "Mash the bananas, then stir in the butter, sugar, egg and vanilla.", "Fold in the baking soda, salt, flour and walnuts until just combined.", "Pour into the tin and bake for 55-60 minutes, until a skewer comes out clean.", "Cool in the tin for 10 minutes, then on a rack."],
    cookingTime: 70, difficulty: "Easy", calories: 290, tags: ["Dessert", "Snack", "American", "Vegetarian"],
  },
];

// [day, mealType, recipe title]
const PLAN: [string, string, string][] = [
  ["Monday", "breakfast", "Overnight Oats with Berries"],
  ["Monday", "dinner", "Lemon Garlic Butter Salmon"],
  ["Tuesday", "lunch", "Greek Salad Wraps"],
  ["Tuesday", "dinner", "Weeknight Chicken Tikka Masala"],
  ["Wednesday", "dinner", "Mushroom Risotto"],
  ["Thursday", "lunch", "Thai Peanut Noodles"],
  ["Friday", "dinner", "Classic Beef Chili"],
  ["Saturday", "breakfast", "Shakshuka"],
  ["Saturday", "dinner", "Weeknight Chicken Tikka Masala"],
  ["Sunday", "breakfast", "Overnight Oats with Berries"],
];

export const seedTestUser = internalMutation({
  args: { userId: v.string(), reset: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!user?.email?.includes("+clerk_test")) {
      throw new ConvexError("Refusing to seed: not a Clerk test user. Sign in once as the test user first.");
    }

    if (args.reset) {
      const plans = await ctx.db
        .query("mealPlans")
        .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
        .collect();
      const items = await ctx.db
        .query("shoppingList")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      for (const row of [...plans, ...items]) await ctx.db.delete(row._id);
      const recipes = await ctx.db
        .query("recipes")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
      for (const recipe of recipes) await ctx.db.delete(recipe._id);
    }

    const ids = new Map<string, Awaited<ReturnType<typeof ctx.db.insert<"recipes">>>>();
    for (const recipe of RECIPES) {
      const id = await ctx.db.insert("recipes", {
        ...recipe,
        userId: args.userId,
        storageId: "",
        isPublic: false,
        authorName: user.name,
        searchText: `${recipe.title} ${user.name}`.toLowerCase(),
      });
      ids.set(recipe.title, id);
      await ctx.scheduler.runAfter(0, internal.ai.tagRecipeIngredients, { recipeId: id });
    }

    for (const [date, mealType, title] of PLAN) {
      await ctx.db.insert("mealPlans", { userId: args.userId, date, mealType, recipeId: ids.get(title)! });
    }

    for (const ingredient of ["2 lemons", "1 bunch cilantro", "Oat milk"]) {
      await ctx.db.insert("shoppingList", { userId: args.userId, ingredient, isChecked: false });
    }

    return { recipes: RECIPES.length, meals: PLAN.length };
  },
});
