import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
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
      return {
        title: "Recipe Not Found | CHEF",
        description: "This recipe may be private or doesn't exist.",
      };
    }

    return {
      title: `${recipe.title} | CHEF`,
      description: recipe.description,
      openGraph: {
        title: recipe.title,
        description: recipe.description,
        images: recipe.imageUrl ? [{ url: recipe.imageUrl }] : [],
        type: "article",
        authors: recipe.authorName ? [recipe.authorName] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: recipe.title,
        description: recipe.description,
        images: recipe.imageUrl ? [recipe.imageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: "Recipe | CHEF",
    };
  }
}

export default async function RecipePage() {
  return <RecipeDetailClient />;
}