"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { ArrowLeft, ArrowRight, Play, Search, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  RecipePhoto,
  formatMinutes,
  matchesQuery,
  todayName,
  useLibrary,
  type LibraryRecipe,
} from "../shared";

type Shelf = { id: string; title: string; recipes: LibraryRecipe[] };

export function CookbookHome() {
  const params = useSearchParams();
  const router = useRouter();
  const { recipes, tags, loading } = useLibrary();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);

  // A comma means "these are ingredients I have", so search the pantry instead.
  const pantryTerms = debounced.includes(",")
    ? debounced.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const shelves = useMemo<Shelf[]>(() => {
    const list: Shelf[] = [
      { id: "quick", title: "Quick weeknights", recipes: recipes.filter((r) => r.cookingTime && r.cookingTime <= 30) },
      { id: "mine", title: "Your recipes", recipes: recipes.filter((r) => r.isMine) },
      { id: "favorites", title: "Favorites", recipes: recipes.filter((r) => r.isFavorite) },
      ...tags.slice(0, 2).map((t) => ({
        id: `tag:${t.name}`,
        title: t.name,
        recipes: recipes.filter((r) => r.tags?.includes(t.name)),
      })),
    ];
    return list.filter((s) => s.recipes.length > 0);
  }, [recipes, tags]);

  const openShelf = shelves.find((s) => s.id === params.get("shelf"));

  if (openShelf) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <button
          onClick={() => router.push("/design/cookbook")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Cook
        </button>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">{openShelf.title}</h1>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {openShelf.recipes.map((r) => (
            <RecipeTile key={r._id} recipe={r} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">What are we cooking?</h1>
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, or list ingredients"
            aria-label="Search recipes, or list ingredients you have"
            aria-describedby="cookbook-search-help"
            className="h-14 w-full rounded-full border bg-card pl-13 pr-12 text-base shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p id="cookbook-search-help" className="mt-2.5 pl-5 text-sm text-muted-foreground">
          Separate ingredients with commas to see what you can make: <em>eggs, feta, tomatoes</em>
        </p>
      </div>

      {pantryTerms ? (
        <PantryResults terms={pantryTerms} />
      ) : debounced.trim() ? (
        <SearchResults recipes={recipes.filter((r) => matchesQuery(r, debounced))} query={debounced} />
      ) : loading ? (
        <HomeSkeleton />
      ) : (
        <>
          <Feature recipes={recipes} />
          <div className="mt-14 flex flex-col gap-14">
            {shelves.map((shelf) => (
              <ShelfRow key={shelf.id} shelf={shelf} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

/** Tonight's planned dinner if there is one, otherwise the newest recipe. */
function Feature({ recipes }: { recipes: LibraryRecipe[] }) {
  const { isAuthenticated } = useConvexAuth();
  const week = useQuery(api.mealPlans.getWeek, isAuthenticated ? {} : "skip");
  const tonight = week?.find((m) => m.date === todayName() && m.mealType.toLowerCase() === "dinner");
  const planned = tonight && recipes.find((r) => r._id === tonight.recipeId);
  const recipe = planned ?? recipes[0];
  if (!recipe) return null;

  return (
    <section className="mt-12 grid overflow-hidden rounded-2xl border bg-card md:grid-cols-[1.4fr_1fr]">
      <Link href={`/design/cookbook/recipe/${recipe._id}`} className="block">
        <RecipePhoto
          src={recipe.imageUrl}
          alt={recipe.title}
          priority
          sizes="(max-width: 768px) 100vw, 60vw"
          className="aspect-[16/10] h-full rounded-none md:aspect-auto md:min-h-[22rem]"
        />
      </Link>
      <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {planned ? "On the plan tonight" : "Newest in your book"}
        </p>
        <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-4xl">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="line-clamp-3 max-w-[50ch] text-muted-foreground">{recipe.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {[formatMinutes(recipe.cookingTime), recipe.difficulty].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild size="lg" className="rounded-full">
            <Link href={`/recipe/${recipe._id}/cook`}>
              <Play />
              Start cooking
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full">
            <Link href={`/design/cookbook/recipe/${recipe._id}`}>View recipe</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ShelfRow({ shelf }: { shelf: Shelf }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">{shelf.title}</h2>
        {shelf.recipes.length > 4 && (
          <Link
            href={`/design/cookbook?shelf=${encodeURIComponent(shelf.id)}`}
            className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            See all {shelf.recipes.length}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className="shelf -mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 md:scroll-px-8 gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
        {shelf.recipes.slice(0, 12).map((r) => (
          <RecipeTile key={r._id} recipe={r} className="w-44 shrink-0 snap-start sm:w-56" />
        ))}
      </div>
    </section>
  );
}

function RecipeTile({ recipe, className }: { recipe: LibraryRecipe; className?: string }) {
  return (
    <Link href={`/design/cookbook/recipe/${recipe._id}`} className={cn("group block", className)}>
      <RecipePhoto
        src={recipe.imageUrl}
        alt={recipe.title}
        sizes="(max-width: 640px) 50vw, 224px"
        className="aspect-[4/5] rounded-xl"
        fallbackClassName="bg-gradient-to-br from-muted to-accent"
      />
      <h3 className="mt-3 line-clamp-2 font-display text-lg font-semibold leading-tight tracking-tight decoration-primary decoration-2 underline-offset-4 group-hover:underline">
        {recipe.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {[formatMinutes(recipe.cookingTime), recipe.difficulty].filter(Boolean).join(" · ")}
      </p>
    </Link>
  );
}

function SearchResults({ recipes, query }: { recipes: LibraryRecipe[]; query: string }) {
  return (
    <section className="mt-10">
      <p className="text-sm text-muted-foreground">
        {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} for &ldquo;{query.trim()}&rdquo;
      </p>
      {recipes.length === 0 ? (
        <p className="mt-6 max-w-md text-muted-foreground">
          Nothing by that name. If those are ingredients, add a comma between them.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {recipes.map((r) => (
            <RecipeTile key={r._id} recipe={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function PantryResults({ terms }: { terms: string[] }) {
  const { isAuthenticated } = useConvexAuth();
  const results = useQuery(api.recipes.searchByIngredients, isAuthenticated ? { ingredients: terms } : "skip");

  if (!isAuthenticated) {
    return <p className="mt-10 text-muted-foreground">Sign in to search by ingredients.</p>;
  }
  if (results === undefined) return <HomeSkeleton />;

  return (
    <section className="mt-10">
      <p className="text-sm text-muted-foreground">
        {results.length === 0
          ? "No recipes use those ingredients yet."
          : `${results.length} ${results.length === 1 ? "recipe uses" : "recipes use"} what you have, best matches first`}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {results.slice(0, 12).map((r) => (
          <Link
            key={r._id}
            href={`/design/cookbook/recipe/${r._id}`}
            className="group grid grid-cols-[6.5rem_1fr] gap-4 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20"
          >
            <RecipePhoto src={r.imageUrl} alt="" sizes="104px" className="aspect-square rounded-lg" />
            <div className="min-w-0 py-1">
              <h3 className="font-display text-lg font-semibold leading-tight tracking-tight">{r.title}</h3>
              <p className="mt-1 text-sm">
                <span className="font-medium text-primary">
                  You have {r.matchCount} of {r.ingredients.length}
                </span>
              </p>
              {r.missingIngredients.length > 0 && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  Missing: {r.missingIngredients.slice(0, 4).join(", ")}
                  {r.missingIngredients.length > 4 && `, +${r.missingIngredients.length - 4} more`}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="mt-12">
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="mt-14 h-7 w-48" />
      <div className="mt-5 flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-56 shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
