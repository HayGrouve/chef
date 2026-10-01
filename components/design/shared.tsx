"use client";

// Data and actions shared by the three /design prototypes. Each direction
// only changes layout and styling; the data and behavior stay identical so
// the comparison is about design, not features.

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export { DIRECTIONS, type DirectionId } from "./directions";

/**
 * Adds a class (plus optional font variables) to <html> while a direction is
 * mounted, so its tokens also reach portaled menus, sheets and toasts.
 */
export function useDirectionTheme(className: string) {
  useEffect(() => {
    const classes = className.split(" ").filter(Boolean);
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [className]);
}

export type LibraryRecipe = ReturnType<typeof useLibrary>["recipes"][number];

/** Everything the user can see, loaded at once (fine at prototype scale). */
export function useLibrary() {
  const { results, status } = usePaginatedQuery(
    api.recipes.list,
    {},
    { initialNumItems: 60 }
  );
  const { user } = useUser();
  const recipes = useMemo(
    () => results.map((r) => ({ ...r, isMine: !!user && r.userId === user.id })),
    [results, user]
  );
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [recipes]);
  return { recipes, tags, loading: status === "LoadingFirstPage" };
}

export type Collection = "all" | "mine" | "favorites" | "quick";

export const COLLECTIONS: { id: Collection; label: string }[] = [
  { id: "all", label: "All recipes" },
  { id: "mine", label: "My recipes" },
  { id: "favorites", label: "Favorites" },
  { id: "quick", label: "Under 30 min" },
];

export function inCollection(recipe: LibraryRecipe, collection: Collection) {
  switch (collection) {
    case "mine":
      return recipe.isMine;
    case "favorites":
      return !!recipe.isFavorite;
    case "quick":
      return !!recipe.cookingTime && recipe.cookingTime <= 30;
    default:
      return true;
  }
}

export function matchesQuery(recipe: LibraryRecipe, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [recipe.title, recipe.description, recipe.authorName ?? "", ...(recipe.tags ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

/** A recipe for the detail screens: the owner's view when signed in, else the public one. */
export function useRecipe(id: string) {
  const recipeId = id as Id<"recipes">;
  const mine = useQuery(api.recipes.get, { id: recipeId });
  const pub = useQuery(api.recipes.getPublic, { id: recipeId });
  if (mine === undefined && pub === undefined) return undefined;
  return mine ?? pub ?? null;
}

export function useRecipeActions(recipeId: string) {
  const id = recipeId as Id<"recipes">;
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  const addBatch = useMutation(api.shoppingList.addBatch);
  const removeBatch = useMutation(api.shoppingList.removeBatch);

  return {
    toggleFavorite: () => toggleFavorite({ id }),
    addToList: async (ingredients: string[]) => {
      const ids = await addBatch({ ingredients, recipeId: id });
      toast.success(`Added ${ingredients.length} items to your shopping list`, {
        action: ids?.length
          ? { label: "Undo", onClick: () => removeBatch({ ids }) }
          : undefined,
      });
    },
    share: async (title: string) => {
      const url = `${window.location.origin}/recipe/${id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    },
  };
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const MEALS = ["breakfast", "lunch", "dinner"] as const;

export function todayName() {
  return DAYS[(new Date().getDay() + 6) % 7];
}

/** Photo with a quiet fallback when a recipe has no image or it fails to load. */
export function RecipePhoto({
  src,
  alt,
  sizes,
  priority,
  className,
  fallbackClassName,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {!src || failed ? (
        <div className={cn("absolute inset-0 grid place-items-center text-muted-foreground/40", fallbackClassName)}>
          <ChefHat className="size-1/4 max-h-12 max-w-12" strokeWidth={1.5} />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function formatMinutes(minutes?: number) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
