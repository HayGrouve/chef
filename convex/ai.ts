import { v, ConvexError } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// --- Rate Limiting ---

export const checkRateLimit = internalMutation({
  args: {
    userId: v.string(),
    actionName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cooldownMs = 30 * 1000; // 30 seconds

    const existingLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) =>
        q.eq("userId", args.userId).eq("action", args.actionName)
      )
      .first();

    if (existingLimit) {
      if (now - existingLimit.lastCalledAt < cooldownMs) {
        throw new ConvexError(
          `Rate limit exceeded. Please wait ${Math.ceil(
            (cooldownMs - (now - existingLimit.lastCalledAt)) / 1000
          )} seconds.`
        );
      }
      await ctx.db.patch(existingLimit._id, { lastCalledAt: now });
    } else {
      await ctx.db.insert("rateLimits", {
        userId: args.userId,
        action: args.actionName,
        lastCalledAt: now,
      });
    }
  },
});

// --- Meal Planner AI ---

export const getMealPlannerData = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // 1. Get all accessible recipes
    const recipes = await ctx.db
      .query("recipes")
      .filter((q) =>
        q.or(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("isPublic"), true)
        )
      )
      .collect();

    // Randomly sample up to 100 recipes to save tokens and keep it fast
    const shuffledRecipes = recipes.sort(() => 0.5 - Math.random());
    const sampledRecipes = shuffledRecipes.slice(0, 100);

    const lightweightRecipes = sampledRecipes.map((r) => ({
      id: r._id,
      title: r.title,
      tags: r.tags || [],
    }));

    // 2. Get existing meal plans to find empty slots
    const existingPlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();

    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const mealTypes = ["breakfast", "lunch", "dinner"];
    const emptySlots = [];

    for (const day of days) {
      for (const type of mealTypes) {
        const hasPlan = existingPlans.some(
          (p) => p.date === day && p.mealType === type
        );
        if (!hasPlan) {
          emptySlots.push({ date: day, mealType: type });
        }
      }
    }

    return {
      recipes: lightweightRecipes,
      emptySlots,
    };
  },
});

export const insertGeneratedMeals = internalMutation({
  args: {
    userId: v.string(),
    newMeals: v.array(
      v.object({
        date: v.string(),
        mealType: v.string(),
        recipeId: v.string(), // We take string from AI, then validate it
      })
    ),
  },
  handler: async (ctx, args) => {
    let insertedCount = 0;

    for (const meal of args.newMeals) {
      try {
        // Validate that the ID is a valid Convex ID format
        const recipeId = ctx.db.normalizeId("recipes", meal.recipeId);
        if (!recipeId) continue; // Skip hallucinated/invalid IDs

        // Verify the recipe actually exists and is accessible
        const recipe = await ctx.db.get(recipeId);
        if (!recipe) continue;
        if (recipe.userId !== args.userId && !recipe.isPublic) continue;

        // Insert the valid meal plan
        await ctx.db.insert("mealPlans", {
          userId: args.userId,
          date: meal.date,
          mealType: meal.mealType,
          recipeId: recipeId,
        });
        insertedCount++;
      } catch (error) {
        // Ignore individual errors (e.g. malformed ID strings)
        console.warn("Skipping invalid recipe ID from AI:", meal.recipeId);
      }
    }

    return insertedCount;
  },
});

export const generateMealPlanWithAI = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    const userId = identity.subject;

    // 1. Check rate limit (30 seconds)
    await ctx.runMutation(internal.ai.checkRateLimit, {
      userId,
      actionName: "generateMealPlan", // Separate from shopping list
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY environment variable not set.");
    }

    // 2. Fetch data
    const data = await ctx.runQuery(internal.ai.getMealPlannerData, { userId });

    if (data.emptySlots.length === 0) {
      return { count: 0, message: "Your week is already fully planned!" };
    }
    if (data.recipes.length === 0) {
      return { count: 0, message: "No recipes available to plan with." };
    }

    // 3. Prepare the prompt
    const prompt = `
You are an expert meal planner. I need you to fill in the empty meal slots for a user's week.

Here are the available recipes (ID, Title, Tags):
${JSON.stringify(data.recipes)}

Here are the empty slots that need to be filled:
${JSON.stringify(data.emptySlots)}

Instructions:
1. Assign exactly one recipe ID to each empty slot.
2. Ensure variety so the user doesn't eat the same thing repeatedly.
3. Prioritize matching tags (e.g., pick a recipe with a 'breakfast' tag for a breakfast slot).
4. Return a JSON array of objects. Each object must have exactly these keys: "date", "mealType", "recipeId".

Return ONLY the JSON array.
`;

    // 4. Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      throw new ConvexError(`Gemini API Error: ${errorText}`);
    }

    const responseData = await response.json();

    try {
      const contentText = responseData.candidates[0].content.parts[0].text;
      const parsedMeals = JSON.parse(contentText);

      // 5. Update the database securely
      const insertedCount: number = await ctx.runMutation(internal.ai.insertGeneratedMeals, {
        userId,
        newMeals: parsedMeals,
      });

      return { 
        count: insertedCount, 
        message: `AI generated ${insertedCount} meals!` 
      };
    } catch (error) {
      console.error("Failed to parse Gemini response:", error);
      throw new ConvexError("Received invalid format from AI.");
    }
  },
});

export const updateShoppingListBatch = internalMutation({
  args: {
    userId: v.string(),
    items: v.array(
      v.object({
        id: v.id("shoppingList"),
        ingredient: v.string(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.items.map(async (item) => {
        const existingItem = await ctx.db.get(item.id);
        // Only update if the item still exists and belongs to the user
        if (existingItem && existingItem.userId === args.userId) {
          await ctx.db.patch(item.id, {
            ingredient: item.ingredient,
            category: item.category,
          });
        }
      })
    );
  },
});

export const organizeShoppingList = action({
  args: {
    items: v.array(
      v.object({
        id: v.id("shoppingList"),
        ingredient: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    const userId = identity.subject;

    // 1. Check rate limit (throws if exceeded)
    await ctx.runMutation(internal.ai.checkRateLimit, {
      userId,
      actionName: "organizeShoppingList",
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY environment variable not set. Please add it to your Convex dashboard.");
    }

    // 2. Prepare the prompt
    const prompt = `
You are a helpful grocery shopping assistant. I have a list of shopping items.
Please fix any spelling errors in the item names and assign a supermarket aisle category to each item.
You can use existing categories like Produce, Dairy, Meat & Seafood, or invent new, specific aisles if appropriate.
Do NOT change the quantities or IDs.

Return the result as a JSON array of objects. Each object must have exactly these keys:
- "id": The exact ID provided.
- "ingredient": The corrected item name (keeping original quantities if present).
- "category": The assigned aisle category.

Here are the items:
${JSON.stringify(args.items, null, 2)}
`;

    // 3. Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      throw new ConvexError(`Gemini API Error: ${errorText}`);
    }

    const data = await response.json();
    
    try {
      const contentText = data.candidates[0].content.parts[0].text;
      const parsedItems = JSON.parse(contentText);

      // 4. Update the database
      await ctx.runMutation(internal.ai.updateShoppingListBatch, {
        userId,
        items: parsedItems,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to parse Gemini response:", error);
      throw new ConvexError(`Received invalid format from AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
