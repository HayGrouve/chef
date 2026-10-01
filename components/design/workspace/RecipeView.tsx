"use client";

import { useState } from "react";
import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";
import {
  ChevronRight,
  Heart,
  MoreHorizontal,
  Pencil,
  Play,
  Share2,
  ShoppingBasket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RecipePhoto, formatMinutes, useRecipe, useRecipeActions } from "../shared";

export function WorkspaceRecipe({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const actions = useRecipeActions(id);
  // Ingredients you tick are ones you already have; the rest go to the list.
  const [have, setHave] = useState<Set<number>>(new Set());

  if (recipe === undefined) return <RecipeSkeleton />;
  if (recipe === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-medium">This recipe is private or no longer exists.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/design/workspace">Back to the library</Link>
        </Button>
      </div>
    );
  }

  const missing = recipe.ingredients.filter((_, i) => !have.has(i));
  const isOwner = "isOwner" in recipe && recipe.isOwner;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/design/workspace" className="hover:text-foreground">
          Library
        </Link>
        {recipe.tags?.[0] && (
          <>
            <ChevronRight className="size-3.5" />
            <Link
              href={`/design/workspace?tag=${encodeURIComponent(recipe.tags[0])}`}
              className="hover:text-foreground"
            >
              {recipe.tags[0]}
            </Link>
          </>
        )}
      </nav>

      <header className="mt-3 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{recipe.title}</h1>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Meta label="Time" value={formatMinutes(recipe.cookingTime)} />
            <Meta label="Difficulty" value={recipe.difficulty} />
            <Meta label="Per serving" value={recipe.calories ? `${recipe.calories} kcal` : null} />
            <Meta
              label="By"
              value={
                recipe.authorName ? (
                  <Link href={`/profile/${recipe.userId}`} className="hover:underline">
                    {recipe.authorName}
                  </Link>
                ) : null
              }
            />
          </dl>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Authenticated>
            <Button
              variant="outline"
              size="icon"
              onClick={actions.toggleFavorite}
              aria-pressed={!!recipe.isFavorite}
              aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn(recipe.isFavorite && "fill-primary text-primary")} />
            </Button>
          </Authenticated>
          {recipe.isPublic && (
            <Button variant="outline" size="icon" onClick={() => actions.share(recipe.title)} aria-label="Share">
              <Share2 />
            </Button>
          )}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/create?edit=${recipe._id}`}>
                    <Pencil />
                    Edit recipe
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Authenticated>
            <Button asChild>
              <Link href={`/recipe/${recipe._id}/cook`}>
                <Play />
                Start cooking
              </Link>
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button asChild>
              <Link href="/sign-in">Sign in to cook</Link>
            </Button>
          </Unauthenticated>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[22rem_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <RecipePhoto
            src={recipe.imageUrl}
            alt={recipe.title}
            priority
            sizes="(max-width: 1024px) 100vw, 352px"
            className="aspect-[4/3] rounded-lg ring-1 ring-border"
          />
          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="font-semibold">Ingredients</h2>
            <span className="text-sm text-muted-foreground">Tick what you have</span>
          </div>
          <ul className="mt-3 flex flex-col">
            {recipe.ingredients.map((line, i) => {
              const checked = have.has(i);
              return (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-1.5 hover:bg-muted/60">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setHave((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      className="mt-0.5"
                    />
                    <span className={cn("text-sm leading-snug", checked && "text-muted-foreground line-through")}>
                      {line}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <Authenticated>
            <Button
              variant="outline"
              className="mt-4 w-full"
              disabled={missing.length === 0}
              onClick={() => actions.addToList(missing)}
            >
              <ShoppingBasket />
              {missing.length === recipe.ingredients.length
                ? "Add all to shopping list"
                : missing.length === 0
                  ? "You have everything"
                  : `Add ${missing.length} missing to list`}
            </Button>
          </Authenticated>
        </aside>

        <section className="min-w-0">
          {recipe.description && (
            <p className="max-w-[65ch] leading-relaxed text-muted-foreground">{recipe.description}</p>
          )}
          <h2 className="mt-8 font-semibold">Method</h2>
          <ol className="mt-4 flex flex-col gap-6">
            {recipe.steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="grid size-7 place-items-center rounded-md bg-muted font-mono text-sm tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <p className="max-w-[65ch] pt-0.5 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {(recipe.tags?.length ?? 0) > 0 && (
            <div className="mt-10 flex flex-wrap gap-1.5 border-t pt-6">
              {recipe.tags!.map((t) => (
                <Link
                  key={t}
                  href={`/design/workspace?tag=${encodeURIComponent(t)}`}
                  className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function RecipeSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[22rem_1fr]">
        <Skeleton className="aspect-[4/3] rounded-lg" />
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
