"use client";

import { useState } from "react";
import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  Flame,
  Gauge,
  Heart,
  Pencil,
  Play,
  Share2,
  ShoppingBasket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RecipePhoto, formatMinutes, useRecipe, useRecipeActions } from "../shared";
import { PlanPicker } from "./PlanPicker";

export function SpacesRecipe({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const actions = useRecipeActions(id);
  const [tab, setTab] = useState<"ingredients" | "method">("ingredients");

  if (recipe === undefined) {
    return (
      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <Skeleton className="aspect-[4/3] rounded-[28px] md:aspect-[21/9]" />
        <Skeleton className="mx-auto -mt-10 h-48 max-w-4xl rounded-[28px]" />
      </main>
    );
  }
  if (recipe === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-xl font-semibold">Recipe not found</p>
        <p className="mt-1 text-muted-foreground">It may be private, or it was deleted.</p>
        <Button asChild variant="outline" className="mt-6 rounded-full">
          <Link href="/design/spaces">Back to recipes</Link>
        </Button>
      </main>
    );
  }

  const isOwner = "isOwner" in recipe && recipe.isOwner;
  const facts = [
    { icon: Clock, value: formatMinutes(recipe.cookingTime) },
    { icon: Gauge, value: recipe.difficulty },
    { icon: Flame, value: recipe.calories ? `${recipe.calories} kcal per serving` : null },
  ].filter((f) => f.value);

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="relative">
        <RecipePhoto
          src={recipe.imageUrl}
          alt={recipe.title}
          priority
          sizes="(max-width: 1200px) 100vw, 1152px"
          className="aspect-[4/3] rounded-[28px] md:aspect-[21/9]"
        />
        <Button
          asChild
          size="icon"
          variant="secondary"
          className="spaces-dock absolute left-3 top-3 rounded-full border"
        >
          <Link href="/design/spaces" aria-label="Back to recipes">
            <ArrowLeft />
          </Link>
        </Button>
      </div>

      <article className="relative mx-auto -mt-12 max-w-4xl rounded-[28px] bg-card p-5 shadow-[0_24px_48px_-24px] shadow-foreground/20 ring-1 ring-border md:-mt-20 md:p-10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{recipe.title}</h1>
          <div className="flex shrink-0 gap-1">
            <Authenticated>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={actions.toggleFavorite}
                aria-pressed={!!recipe.isFavorite}
                aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={cn(recipe.isFavorite && "fill-primary text-primary")} />
              </Button>
            </Authenticated>
            {recipe.isPublic && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => actions.share(recipe.title)}
                aria-label="Share"
              >
                <Share2 />
              </Button>
            )}
            {isOwner && (
              <Button asChild variant="ghost" size="icon" className="rounded-full">
                <Link href={`/create?edit=${recipe._id}`} aria-label="Edit recipe">
                  <Pencil />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {recipe.authorName && (
          <p className="mt-1 text-sm text-muted-foreground">
            By{" "}
            <Link href={`/profile/${recipe.userId}`} className="hover:underline">
              {recipe.authorName}
            </Link>
          </p>
        )}
        {recipe.description && (
          <p className="mt-4 max-w-[65ch] leading-relaxed text-muted-foreground">{recipe.description}</p>
        )}
        {facts.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {facts.map(({ icon: Icon, value }) => (
              <li key={value} className="flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-sm">
                <Icon className="size-4 text-primary" />
                {value}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Authenticated>
            <Button asChild size="lg" className="rounded-full">
              <Link href={`/recipe/${recipe._id}/cook`}>
                <Play />
                Start cooking
              </Link>
            </Button>
            <PlanPicker recipeId={recipe._id} recipeTitle={recipe.title}>
              <Button size="lg" variant="outline" className="rounded-full">
                <CalendarPlus />
                Plan it
              </Button>
            </PlanPicker>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full"
              onClick={() => actions.addToList(recipe.ingredients)}
            >
              <ShoppingBasket />
              Add to list
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button asChild size="lg" className="rounded-full">
              <Link href="/sign-in">Sign in to cook</Link>
            </Button>
          </Unauthenticated>
        </div>

        <div className="mt-8 flex rounded-full bg-muted p-1 md:hidden" role="tablist" aria-label="Show">
          {(
            [
              ["ingredients", `Ingredients (${recipe.ingredients.length})`],
              ["method", `Method (${recipe.steps.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium text-muted-foreground",
                tab === value && "bg-card text-foreground shadow-sm"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-10 md:mt-10 md:grid-cols-[16rem_1fr]">
          <section className={cn(tab !== "ingredients" && "max-md:hidden")}>
            <h2 className="hidden text-lg font-semibold md:block">Ingredients</h2>
            <ul className="flex flex-col gap-2.5 md:mt-4">
              {recipe.ingredients.map((line, i) => (
                <li key={i} className="rounded-2xl bg-muted/60 px-3.5 py-2.5 text-sm leading-snug">
                  {line}
                </li>
              ))}
            </ul>
          </section>
          <section className={cn(tab !== "method" && "max-md:hidden")}>
            <h2 className="hidden text-lg font-semibold md:block">Method</h2>
            <ol className="flex flex-col gap-5 md:mt-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-primary/12 text-sm font-semibold tabular-nums text-primary">
                    {i + 1}
                  </span>
                  <p className="max-w-[60ch] pt-1.5 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>
    </main>
  );
}
