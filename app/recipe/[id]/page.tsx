import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import RecipeDetailClient from "./RecipeDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const recipeId = resolvedParams.id as Id<"recipes">;
  
  try {
    // Fetch the public recipe data for metadata
    const recipe = await fetchQuery(api.recipes.getPublic, { id: recipeId });

    if (!recipe) {
      // Not public: it may be the visitor's own private recipe. Title it for
      // them (asking as them), but keep it out of the social preview tags.
      const token = (await (await auth()).getToken({ template: "convex" })) ?? undefined;
      const own = token ? await fetchQuery(api.recipes.get, { id: recipeId }, { token }) : null;
      return { title: own ? own.title : "Recipe not found" };
    }

    return {
      title: recipe.title,
      description: recipe.description,
      openGraph: {
        title: recipe.title,
        description: recipe.description,
        type: "article",
        authors: recipe.authorName ? [recipe.authorName] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: recipe.title,
        description: recipe.description,
      },
    };
  } catch (error) {
    return {
      title: "Recipe",
    };
  }
}

export default async function RecipePage() {
  return <RecipeDetailClient />;
}