"use client";

// PROTOTYPE — a secondary row of recipe cards ("Your cookbook", "Discover") on
// the "Today" hub. Horizontal scroll on mobile, 4-up grid on desktop.
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RecipeCard } from "@/components/RecipeCard";
import { LikeButton } from "@/components/ui/like-button";
import type { Overview } from "./lib";
import { SectionTitle } from "./parts";

type ShelfRecipe = Overview["myRecipes"][number];

export function RecipeShelf({
  title,
  description,
  href,
  linkLabel,
  recipes,
}: {
  title: string;
  description?: string;
  href: string;
  linkLabel: string;
  recipes: ShelfRecipe[];
}) {
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  if (recipes.length === 0) return null;

  return (
    <section>
      <SectionTitle title={title} description={description} href={href} linkLabel={linkLabel} />
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
        {recipes.slice(0, 4).map((recipe) => (
          <div key={recipe._id} className="w-64 shrink-0 snap-start md:w-auto">
            <RecipeCard
              recipe={recipe}
              action={
                <LikeButton
                  isFavorite={recipe.isFavorite}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite({ id: recipe._id });
                  }}
                />
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
