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

    // Template details
    const templateId = "e1a859bb-3360-47dc-bde2-98f9d2d17b6e";
    const version = 1;

    // Encode variables
    const imageUrl = encodeURIComponent(recipe.imageUrl || "_");
    const logoUrl = encodeURIComponent("https://armyant.app/apple-icon.png?apple-icon.e12f5529.png");
    const brandNameText = encodeURIComponent("CHEF");
    const categoryText = encodeURIComponent("RECIPE");
    const titleText = encodeURIComponent(recipe.title || "_");
    const descriptionText = encodeURIComponent(recipe.description || "_");
    const authorText = encodeURIComponent(recipe.authorName ? `Recipe by ${recipe.authorName}` : "_");
    const ctaText = encodeURIComponent("View Recipe");

    // Construct the URL
    const ogImageUrl = `https://ogcdn.net/${templateId}/v${version}/${imageUrl}/${logoUrl}/${brandNameText}/${categoryText}/${titleText}/${descriptionText}/${authorText}/${ctaText}/og.png`;

    return {
      title: `${recipe.title} | CHEF`,
      description: recipe.description,
      openGraph: {
        title: recipe.title,
        description: recipe.description,
        images: [{ url: ogImageUrl }],
        type: "article",
        authors: recipe.authorName ? [recipe.authorName] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: recipe.title,
        description: recipe.description,
        images: [ogImageUrl],
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