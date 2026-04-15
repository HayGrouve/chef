import { ImageResponse } from "next/og";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Recipe Preview";
export const size = {
  width: 800,
  height: 420,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const recipeId = resolvedParams.id as Id<"recipes">;

  try {
    // Fetch the recipe data from Convex
    const recipe = await fetchQuery(api.recipes.getPublic, { id: recipeId });

    if (!recipe) {
      return new ImageResponse(
        (
          <div tw="flex h-full w-full items-center justify-center bg-zinc-900 text-white text-4xl font-bold">
            Recipe Not Found
          </div>
        ),
        { ...size }
      );
    }

    // Return the dynamic image using HTML/Tailwind
    return new ImageResponse(
      (
        <div tw="flex h-full w-full bg-white flex-row font-sans">
          {/* Left Side: Image */}
          <div tw="flex w-1/2 h-full bg-zinc-100 relative">
            {recipe.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recipe.imageUrl}
                tw="w-full h-full object-cover"
                alt={recipe.title}
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div tw="flex w-full h-full items-center justify-center text-zinc-400 text-5xl font-bold bg-zinc-200">
                CHEF
              </div>
            )}
            {/* Overlay gradient for text readability if needed, or just a clean cut */}
            <div tw="absolute inset-0 border-r-4 border-orange-500"></div>
          </div>

          {/* Right Side: Content */}
          <div tw="flex flex-col w-1/2 h-full p-8 justify-between bg-zinc-900 text-white">
            <div tw="flex flex-col">
              <div tw="flex items-center mb-4">
                <span tw="text-orange-500 font-bold text-lg tracking-widest uppercase">
                  CHEF RECIPE
                </span>
                {recipe.difficulty && (
                  <span tw="ml-3 px-2 py-1 rounded-full border border-zinc-700 text-zinc-300 text-sm">
                    {recipe.difficulty}
                  </span>
                )}
                {recipe.cookingTime && (
                  <span tw="ml-3 px-2 py-1 rounded-full border border-zinc-700 text-zinc-300 text-sm">
                    {recipe.cookingTime}m
                  </span>
                )}
              </div>
              <h1 tw="text-5xl font-bold leading-tight mb-4 tracking-tight text-white">
                {recipe.title}
              </h1>
              <p tw="text-2xl text-zinc-400 leading-snug" style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
                {recipe.description}
              </p>
            </div>

            <div tw="flex items-center justify-between mt-auto">
              <div tw="flex items-center">
                <span tw="text-lg text-zinc-300 font-medium">
                  {recipe.authorName ? `By ${recipe.authorName}` : "Community Recipe"}
                </span>
              </div>
              <div tw="flex items-center px-4 py-2 bg-orange-500 text-white rounded-full text-lg font-bold">
                View Recipe
              </div>
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (e) {
    return new ImageResponse(
      (
        <div tw="flex h-full w-full items-center justify-center bg-zinc-900 text-white text-4xl">
          CHEF
        </div>
      ),
      { ...size }
    );
  }
}