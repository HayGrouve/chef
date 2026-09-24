"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Authenticated,
  Unauthenticated,
  usePaginatedQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeCardSkeleton } from "@/components/RecipeCardSkeleton";
import {
  Plus,
  Search,
  SearchX,
  UtensilsCrossed,
  Loader2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
import { Badge } from "@/components/ui/badge";
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
  SheetTrigger,
} from "@/components/ui/sheet";

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

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Debounce search for API calls
  const debouncedSearch = useDebounce(search, 500);

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

  // Update URL whenever debounced state changes
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
    {
      search: debouncedSearch === "" ? undefined : debouncedSearch,
      difficulty: difficulty === "all" ? undefined : difficulty,
      maxTime: maxTime === MAX_TIME_ANY ? undefined : maxTime,
      favoritesOnly: favoritesOnly ? true : undefined,
      myRecipesOnly: myRecipesOnly ? true : undefined,
    },
    { initialNumItems: 9 }
  );

  const recipes = results;
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);

  // Extract unique tags from recipes for the filter list (from all loaded recipes)
  const allTags = Array.from(
    new Set(recipes?.flatMap((r) => r.tags || []) || [])
  ).sort();

  // Client-side filtering for tags (AND logic)
  const filteredRecipes = recipes?.filter((recipe) => {
    if (selectedTags.length === 0) return true;
    // Recipe must include ALL selected tags
    return selectedTags.every((tag) => recipe.tags?.includes(tag));
  });

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

  const activeFilterCount =
    selectedTags.length +
    (difficulty !== "all" ? 1 : 0) +
    (maxTime !== MAX_TIME_ANY ? 1 : 0) +
    (favoritesOnly ? 1 : 0) +
    (myRecipesOnly ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || debouncedSearch !== "";

  return (
    <div className="container mx-auto p-4">
      <Unauthenticated>
        <SignUpBanner />
      </Unauthenticated>

      <div className="flex flex-col md:flex-row gap-8 mt-2">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-60 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <RecipeFilters {...filterProps} />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes or authors..."
                className="pl-9 pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile Filters */}
            <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="rounded-full px-1.5 min-w-5 h-5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
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
                  <Button className="flex-1" onClick={() => setIsMobileFiltersOpen(false)}>
                    Done
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
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
                className="h-6 px-2 text-xs text-muted-foreground"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Recipe Listings */}
          {status === "LoadingFirstPage" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredRecipes?.length === 0 ? (
            <div className="text-center py-16">
              {hasActiveFilters ? (
                <div className="flex flex-col items-center gap-4">
                  <SearchX className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    No recipes match your search.
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
                  <Authenticated>
                    <p className="text-lg text-muted-foreground">
                      No recipes yet. Be the first to share one!
                    </p>
                    <Link href="/create">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create a recipe
                      </Button>
                    </Link>
                  </Authenticated>
                  <Unauthenticated>
                    <p className="text-lg text-muted-foreground">
                      No public recipes found yet.
                    </p>
                  </Unauthenticated>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredRecipes?.map((recipe) => (
                  <RecipeCard
                    key={recipe._id}
                    recipe={recipe}
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
                ))}
              </div>

              {status === "CanLoadMore" && (
                <div className="flex justify-center py-8">
                  <Button variant="outline" onClick={() => loadMore(9)} disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
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

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <title>CHEF | Home</title>
      <meta name="description" content="Your personal digital cookbook" />
      <Suspense
        fallback={
          <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:ml-68">
              {[...Array(6)].map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </main>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal">
      {label}
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-foreground/10"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
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
    <div className="mb-4 flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-2.5 text-sm">
      <p className="flex-1">
        <span className="font-medium">Browsing for free.</span>{" "}
        <span className="text-muted-foreground">
          Sign up to save favorites and share your own recipes.
        </span>
      </p>
      <Link href="/sign-up">
        <Button size="sm">Sign up</Button>
      </Link>
      <button
        onClick={() => {
          localStorage.setItem(BANNER_DISMISSED_KEY, "true");
          setDismissed(true);
        }}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
