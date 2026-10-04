"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { pluralize } from "@/lib/utils";
import { RecipeCard, RecipePhoto, formatMinutes } from "@/components/RecipeCard";
import { RecipeCardSkeleton } from "@/components/RecipeCardSkeleton";
import {
  ArrowRight,
  Loader2,
  Play,
  Plus,
  Search,
  SearchX,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LikeButton } from "@/components/ui/like-button";
import { InstallDialog } from "@/components/install-dialog";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { RecipeFilters, MAX_TIME_ANY } from "@/components/RecipeFilters";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PAGE_SIZE = 24;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Recipe = FunctionReturnType<typeof api.recipes.list>["page"][number];

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize state from URL or defaults
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tags") ? searchParams.get("tags")!.split("|") : []
  );
  const [difficulty, setDifficulty] = useState<string>(
    searchParams.get("difficulty") || "all"
  );
  const [maxTime, setMaxTime] = useState<number>(
    searchParams.get("maxTime") ? parseInt(searchParams.get("maxTime")!) : MAX_TIME_ANY
  );
  const [favoritesOnly, setFavoritesOnly] = useState(
    searchParams.get("favorites") === "true"
  );
  const [myRecipesOnly, setMyRecipesOnly] = useState(
    searchParams.get("myRecipes") === "true"
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  // A comma means "these are ingredients I have": search the pantry instead.
  const pantryTerms = debouncedSearch.includes(",")
    ? debouncedSearch.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  // Sync state to URL
  const updateUrl = useCallback(() => {
    const currentQueryString = searchParams.toString();
    const params = new URLSearchParams(currentQueryString);

    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");

    if (selectedTags.length > 0) params.set("tags", selectedTags.join("|"));
    else params.delete("tags");

    if (difficulty !== "all") params.set("difficulty", difficulty);
    else params.delete("difficulty");

    if (maxTime !== MAX_TIME_ANY) params.set("maxTime", maxTime.toString());
    else params.delete("maxTime");

    if (favoritesOnly) params.set("favorites", "true");
    else params.delete("favorites");

    if (myRecipesOnly) params.set("myRecipes", "true");
    else params.delete("myRecipes");

    const newQueryString = params.toString();
    if (currentQueryString !== newQueryString) {
      router.replace(`${pathname}?${newQueryString}`, { scroll: false });
    }
  }, [
    debouncedSearch,
    selectedTags,
    difficulty,
    maxTime,
    favoritesOnly,
    myRecipesOnly,
    pathname,
    router,
    searchParams,
  ]);

  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  const clearFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setDifficulty("all");
    setMaxTime(MAX_TIME_ANY);
    setFavoritesOnly(false);
    setMyRecipesOnly(false);
  };

  // PWA Install Prompt Logic
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

      const timer = setTimeout(() => {
        setIsIOS(isIosDevice);
        const hasSeenPrompt = localStorage.getItem("hasSeenInstallPrompt");
        if (!hasSeenPrompt) {
          setShowInstallDialog(true);
          localStorage.setItem("hasSeenInstallPrompt", "true");
        }
      }, 0);

      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("welcome");
      router.replace(`/?${newParams.toString()}`, { scroll: false });

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.recipes.list,
    pantryTerms
      ? "skip"
      : {
          search: debouncedSearch === "" ? undefined : debouncedSearch,
          difficulty: difficulty === "all" ? undefined : difficulty,
          maxTime: maxTime === MAX_TIME_ANY ? undefined : maxTime,
          favoritesOnly: favoritesOnly ? true : undefined,
          myRecipesOnly: myRecipesOnly ? true : undefined,
        },
    { initialNumItems: PAGE_SIZE }
  );

  // Tags come from the loaded recipes; tag filtering is client-side (AND).
  const allTags = useMemo(
    () => Array.from(new Set(results.flatMap((r) => r.tags || []))).sort(),
    [results]
  );
  const filteredRecipes = results.filter((recipe) =>
    selectedTags.every((tag) => recipe.tags?.includes(tag))
  );

  const activeFilterCount =
    selectedTags.length +
    (difficulty !== "all" ? 1 : 0) +
    (maxTime !== MAX_TIME_ANY ? 1 : 0) +
    (favoritesOnly ? 1 : 0) +
    (myRecipesOnly ? 1 : 0);
  const browsing = activeFilterCount > 0 || debouncedSearch !== "";

  const filterProps = {
    difficulty,
    setDifficulty,
    maxTime,
    setMaxTime,
    favoritesOnly,
    setFavoritesOnly,
    myRecipesOnly,
    setMyRecipesOnly,
    selectedTags,
    setSelectedTags,
    allTags,
  };

  const openShelf = (shelf: Shelf) => {
    window.scrollTo({ top: 0 });
    if (shelf.id === "quick") setMaxTime(30);
    else if (shelf.id === "mine") setMyRecipesOnly(true);
    else if (shelf.id === "favorites") setFavoritesOnly(true);
    else setSelectedTags([shelf.title]);
  };

  return (
    <div className="container mx-auto px-4 pb-16 pt-6 md:pt-10">
      <Unauthenticated>
        <SignUpBanner />
      </Unauthenticated>

      <div className="max-w-3xl">
        <h1 className="text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
          What are we cooking?
        </h1>
        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search, or list ingredients…"
              aria-label="Search recipes, or list ingredients you have"
              aria-describedby="home-search-help"
              className="h-14 w-full rounded-full border bg-card pl-13 pr-12 text-base shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            className="relative h-14 gap-2 px-5 max-sm:w-14 max-sm:px-0"
            onClick={() => setFiltersOpen(true)}
            aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"}
          >
            <SlidersHorizontal className="size-5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="h-5 min-w-5 rounded-full px-1.5 max-sm:absolute max-sm:-right-1 max-sm:-top-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
        <p id="home-search-help" className="mt-2.5 pl-5 text-sm text-muted-foreground">
          Separate ingredients with commas to see what you can make: <em>eggs, feta, tomatoes</em>
        </p>
      </div>

      {activeFilterCount > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {difficulty !== "all" && (
            <FilterChip label={difficulty} onRemove={() => setDifficulty("all")} />
          )}
          {maxTime !== MAX_TIME_ANY && (
            <FilterChip label={`≤ ${maxTime} min`} onRemove={() => setMaxTime(MAX_TIME_ANY)} />
          )}
          {favoritesOnly && (
            <FilterChip label="Favorites" onRemove={() => setFavoritesOnly(false)} />
          )}
          {myRecipesOnly && (
            <FilterChip label="My recipes" onRemove={() => setMyRecipesOnly(false)} />
          )}
          {selectedTags.map((tag) => (
            <FilterChip
              key={tag}
              label={tag}
              onRemove={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2.5 text-muted-foreground"
          >
            Clear all
          </Button>
        </div>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto overscroll-contain sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="font-display text-xl">Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <RecipeFilters {...filterProps} />
          </div>
          <SheetFooter className="flex-row">
            {activeFilterCount > 0 && (
              <Button variant="outline" className="flex-1" onClick={clearFilters}>
                Reset
              </Button>
            )}
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {pantryTerms ? (
        <PantryResults terms={pantryTerms} />
      ) : status === "LoadingFirstPage" ? (
        browsing ? <ResultsSkeleton /> : <DiscoverSkeleton />
      ) : filteredRecipes.length === 0 ? (
        <EmptyState filtered={browsing} onClear={clearFilters} />
      ) : browsing ? (
        <section className="mt-8">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filteredRecipes.length}
            {status === "CanLoadMore" ? "+" : ""}{" "}
            {filteredRecipes.length === 1 ? "recipe" : "recipes"}
            {debouncedSearch && <> for &ldquo;{debouncedSearch}&rdquo;</>}
          </p>
          <RecipeGrid recipes={filteredRecipes} />
        </section>
      ) : (
        <Discover recipes={filteredRecipes} onOpenShelf={openShelf} />
      )}

      {!pantryTerms && status === "CanLoadMore" && filteredRecipes.length > 0 && (
        <div className="flex justify-center pt-10">
          <Button variant="outline" size="lg" onClick={() => loadMore(PAGE_SIZE)} disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      <InstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
        isIOS={isIOS}
        onInstall={() => {
          setShowInstallDialog(false);
        }}
      />
    </div>
  );
}

type Shelf = { id: string; title: string; recipes: Recipe[] };

/** The unfiltered home: a feature, then shelves, then everything. */
function Discover({
  recipes,
  onOpenShelf,
}: {
  recipes: Recipe[];
  onOpenShelf: (shelf: Shelf) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();

  const shelves = useMemo<Shelf[]>(() => {
    const tagCounts = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 2)
      .map(([t]) => t);
    const list: Shelf[] = [
      { id: "quick", title: "Quick weeknights", recipes: recipes.filter((r) => r.cookingTime && r.cookingTime <= 30) },
      ...(isAuthenticated
        ? [
            { id: "mine", title: "Your recipes", recipes: recipes.filter((r) => r.userId === user?.id) },
            { id: "favorites", title: "Favorites", recipes: recipes.filter((r) => r.isFavorite) },
          ]
        : []),
      ...topTags.map((t) => ({ id: `tag:${t}`, title: t, recipes: recipes.filter((r) => r.tags?.includes(t)) })),
    ];
    // A shelf is only worth showing with a few recipes on it.
    return list.filter((s) => s.recipes.length >= 3);
  }, [recipes, isAuthenticated, user?.id]);

  return (
    <>
      <Feature recipes={recipes} />
      <div className="mt-14 flex flex-col gap-14">
        {shelves.map((shelf) => (
          <ShelfRow key={shelf.id} shelf={shelf} onSeeAll={() => onOpenShelf(shelf)} />
        ))}
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">All recipes</h2>
          <RecipeGrid recipes={recipes} />
        </section>
      </div>
    </>
  );
}

/** Tonight's planned dinner if there is one, otherwise the newest recipe with a photo. */
function Feature({ recipes }: { recipes: Recipe[] }) {
  const { isAuthenticated } = useConvexAuth();
  const week = useQuery(api.mealPlans.getWeek, isAuthenticated ? {} : "skip");
  const today = DAYS[(new Date().getDay() + 6) % 7];
  const tonight = week?.find((m) => m.date === today && m.mealType.toLowerCase() === "dinner");
  const planned = tonight && recipes.find((r) => r._id === tonight.recipeId);
  const recipe = planned ?? recipes.find((r) => r.imageUrl) ?? recipes[0];
  if (!recipe) return null;

  return (
    <section className="mt-12 grid overflow-hidden rounded-2xl border bg-card md:grid-cols-[1.4fr_1fr]">
      <Link href={`/recipe/${recipe._id}`} tabIndex={-1} aria-hidden>
        <RecipePhoto
          src={recipe.imageUrl}
          alt=""
          priority
          sizes="(max-width: 768px) 100vw, 60vw"
          className="aspect-[16/10] h-full md:aspect-auto md:min-h-[22rem]"
        />
      </Link>
      <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {planned ? "On the plan tonight" : "Newest recipe"}
        </p>
        <h2 className="text-balance break-words font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-4xl">
          <Link href={`/recipe/${recipe._id}`} className="hover:underline decoration-primary decoration-2 underline-offset-4">
            {recipe.title}
          </Link>
        </h2>
        {recipe.description && (
          <p className="line-clamp-3 max-w-[50ch] text-muted-foreground">{recipe.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {[formatMinutes(recipe.cookingTime), recipe.difficulty, recipe.authorName && `by ${recipe.authorName}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Authenticated>
            <Button asChild size="lg">
              <Link href={`/recipe/${recipe._id}/cook`}>
                <Play />
                Start cooking
              </Link>
            </Button>
          </Authenticated>
          <Authenticated>
            <Button asChild size="lg" variant="ghost">
              <Link href={`/recipe/${recipe._id}`}>View recipe</Link>
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button asChild size="lg">
              <Link href={`/recipe/${recipe._id}`}>View recipe</Link>
            </Button>
          </Unauthenticated>
        </div>
      </div>
    </section>
  );
}

function ShelfRow({ shelf, onSeeAll }: { shelf: Shelf; onSeeAll: () => void }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">{shelf.title}</h2>
        <button
          onClick={onSeeAll}
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          See all
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
      <div className="shelf -mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2">
        {shelf.recipes.slice(0, 12).map((r) => (
          <RecipeTile key={r._id} recipe={r} className="w-44 shrink-0 snap-start sm:w-56" />
        ))}
      </div>
    </section>
  );
}

function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {recipes.map((r) => (
        // Skip rendering off-screen tiles; the grid grows with every "Load more".
        // The padding keeps focus rings inside the contained box.
        <RecipeTile key={r._id} recipe={r} className="-m-1 p-1 [contain-intrinsic-size:auto_22rem] [content-visibility:auto]" />
      ))}
    </div>
  );
}

function RecipeTile({ recipe, className }: { recipe: Recipe; className?: string }) {
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  return (
    <RecipeCard
      recipe={recipe}
      className={className}
      action={
        <Authenticated>
          <LikeButton
            isFavorite={recipe.isFavorite || false}
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite({ id: recipe._id });
            }}
          />
        </Authenticated>
      }
    />
  );
}

function PantryResults({ terms }: { terms: string[] }) {
  const { isAuthenticated } = useConvexAuth();
  const results = useQuery(api.recipes.searchByIngredients, isAuthenticated ? { ingredients: terms } : "skip");

  if (!isAuthenticated) {
    return (
      <p className="mt-10 text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>{" "}
        to search by the ingredients you have.
      </p>
    );
  }
  if (results === undefined) return <ResultsSkeleton />;

  return (
    <section className="mt-10">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {results.length === 0
          ? "No recipes use those ingredients yet."
          : `${pluralize(results.length, "recipe uses", "recipes use")} what you have, best matches first`}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {results.map((r) => (
          <Link
            key={r._id}
            href={`/recipe/${r._id}`}
            className="grid grid-cols-[6.5rem_1fr] gap-4 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20"
          >
            <RecipePhoto src={r.imageUrl} alt="" sizes="104px" className="aspect-square rounded-lg" />
            <div className="min-w-0 py-1">
              <h3 className="line-clamp-2 break-words font-display text-lg font-semibold leading-tight tracking-tight">{r.title}</h3>
              <p className="mt-1 text-sm font-medium text-primary">
                You have {r.matchCount} of {r.ingredients.length}
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

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center">
      {filtered ? (
        <>
          <SearchX className="size-10 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-display text-xl font-semibold">Nothing matches</p>
          <p className="max-w-sm text-muted-foreground">
            Try another word, or clear the filters. Listing ingredients? Separate them with commas.
          </p>
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        </>
      ) : (
        <>
          <UtensilsCrossed className="size-10 text-muted-foreground" strokeWidth={1.5} />
          <Authenticated>
            <p className="font-display text-xl font-semibold">Your cookbook is empty</p>
            <p className="max-w-sm text-muted-foreground">Write a recipe, or import one from a link or photo.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/create">
                  <Plus />
                  Write a recipe
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/import">Import one</Link>
              </Button>
            </div>
          </Authenticated>
          <Unauthenticated>
            <p className="font-display text-xl font-semibold">No public recipes yet</p>
          </Unauthenticated>
        </>
      )}
    </div>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="mt-12">
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="mt-14 h-7 w-48" />
      <div className="mt-5 flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <RecipeCardSkeleton key={i} className="w-44 shrink-0 sm:w-56" />
        ))}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 8 }, (_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <title>CHEF | Home</title>
      <meta name="description" content="Your personal digital cookbook" />
      <Suspense
        fallback={
          <div className="container mx-auto px-4 pt-10">
            <Skeleton className="h-12 w-80 max-w-full" />
            <Skeleton className="mt-6 h-14 max-w-3xl rounded-full" />
            <DiscoverSkeleton />
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="h-7 gap-1 rounded-full pl-3 pr-1 text-sm font-normal">
      {label}
      <button
        onClick={onRemove}
        className="rounded-full p-1 hover:bg-foreground/10"
        aria-label={`Remove ${label} filter`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

const BANNER_DISMISSED_KEY = "signUpBannerDismissed";

function SignUpBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Read after mount to avoid a hydration mismatch
    const timer = setTimeout(
      () => setDismissed(localStorage.getItem(BANNER_DISMISSED_KEY) === "true"),
      0
    );
    return () => clearTimeout(timer);
  }, []);

  if (dismissed) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-2.5 text-sm">
      <p className="flex-1">
        <span className="font-medium">Browsing for free.</span>{" "}
        <span className="text-muted-foreground">
          Sign up to save favorites and share your own recipes.
        </span>
      </p>
      <Button asChild size="sm">
        <Link href="/sign-up">Sign up</Link>
      </Button>
      <button
        onClick={() => {
          localStorage.setItem(BANNER_DISMISSED_KEY, "true");
          setDismissed(true);
        }}
        className="-m-1.5 rounded-full p-1.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        aria-label="Dismiss sign-up banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
