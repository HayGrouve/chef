"use client";

import { useState } from "react";
import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";
import { ArrowLeft, Heart, Pencil, Play, Share2, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { scaleIngredient } from "@/lib/recipe-text";
import { cn } from "@/lib/utils";
import { RecipePhoto, formatMinutes, useRecipe, useRecipeActions } from "../shared";

const SCALES = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
];

export function CookbookRecipe({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const actions = useRecipeActions(id);
  const [scale, setScale] = useState(1);

  if (recipe === undefined) return <RecipeSkeleton />;
  if (recipe === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-display text-2xl font-bold">Recipe not found</p>
        <p className="mt-2 text-muted-foreground">It may be private, or it was deleted.</p>
        <Button asChild variant="outline" className="mt-6 rounded-full">
          <Link href="/design/cookbook">Back to Cook</Link>
        </Button>
      </main>
    );
  }

  const ingredients = recipe.ingredients.map((line) => (scale === 1 ? line : scaleIngredient(line, scale)));
  const isOwner = "isOwner" in recipe && recipe.isOwner;
  const facts = [
    { label: "Time", value: formatMinutes(recipe.cookingTime) },
    { label: "Difficulty", value: recipe.difficulty },
    { label: "Per serving", value: recipe.calories ? `${recipe.calories} kcal` : null },
    { label: "Steps", value: String(recipe.steps.length) },
  ].filter((f) => f.value);

  return (
    <main className="pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-8 md:pt-10">
        <Link
          href="/design/cookbook"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Cook
        </Link>

        <h1 className="mt-6 max-w-4xl font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">{recipe.description}</p>
        )}
        {recipe.authorName && (
          <p className="mt-4 text-sm">
            By{" "}
            <Link href={`/profile/${recipe.userId}`} className="font-medium underline-offset-4 hover:underline">
              {recipe.authorName}
            </Link>
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Authenticated>
            <Button asChild size="lg" className="rounded-full">
              <Link href={`/recipe/${recipe._id}/cook`}>
                <Play />
                Start cooking
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full" onClick={() => actions.addToList(ingredients)}>
              <ShoppingBasket />
              Add to list
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              className="rounded-full"
              onClick={actions.toggleFavorite}
              aria-pressed={!!recipe.isFavorite}
              aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn(recipe.isFavorite && "fill-primary text-primary")} />
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button asChild size="lg" className="rounded-full">
              <Link href="/sign-in">Sign in to cook</Link>
            </Button>
          </Unauthenticated>
          {recipe.isPublic && (
            <Button
              size="icon-lg"
              variant="ghost"
              className="rounded-full"
              onClick={() => actions.share(recipe.title)}
              aria-label="Share"
            >
              <Share2 />
            </Button>
          )}
          {isOwner && (
            <Button asChild size="icon-lg" variant="ghost" className="rounded-full" aria-label="Edit recipe">
              <Link href={`/create?edit=${recipe._id}`}>
                <Pencil />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-4 md:px-8">
        <RecipePhoto
          src={recipe.imageUrl}
          alt={recipe.title}
          priority
          sizes="(max-width: 1200px) 100vw, 1152px"
          className="aspect-[16/9] rounded-2xl md:aspect-[21/9]"
        />
        {facts.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-y-4 md:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="border-l-2 border-primary/70 pl-4">
                <dt className="text-sm text-muted-foreground">{f.label}</dt>
                <dd className="font-display text-xl font-semibold tracking-tight">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-12 px-4 md:grid-cols-[18rem_1fr] md:px-8">
        <section className="md:sticky md:top-24 md:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight">Ingredients</h2>
            <div className="flex rounded-full bg-muted p-0.5" role="group" aria-label="Scale">
              {SCALES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScale(s.value)}
                  aria-pressed={scale === s.value}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
                    scale === s.value && "bg-background text-foreground shadow-sm"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {ingredients.map((line, i) => (
              <li key={i} className="flex gap-3 leading-snug">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Method</h2>
          <ol className="mt-6 flex flex-col gap-8">
            {recipe.steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[3rem_1fr] gap-2">
                <span className="font-display text-3xl font-bold leading-none tabular-nums text-primary">
                  {i + 1}
                </span>
                <p className="max-w-[60ch] pt-1 text-[1.0625rem] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {(recipe.tags?.length ?? 0) > 0 && (
            <p className="mt-12 text-sm text-muted-foreground">Filed under {recipe.tags!.join(", ")}</p>
          )}
        </section>
      </div>
    </main>
  );
}

function RecipeSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 md:px-8">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-6 h-14 w-3/4" />
      <Skeleton className="mt-5 h-5 w-2/3" />
      <Skeleton className="mt-10 aspect-[21/9] rounded-2xl" />
    </main>
  );
}
