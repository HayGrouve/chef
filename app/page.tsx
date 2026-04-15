"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Authenticated,
  Unauthenticated,
  usePaginatedQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { RecipeCardSkeleton } from "@/components/RecipeCardSkeleton";
import {
  Plus,
  LogIn,
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
import { RecipeFilters } from "@/components/RecipeFilters";
import { MobileFilterSheet } from "@/components/MobileFilterSheet";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Sheet,
  SheetContent,
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
    searchParams.get("maxTime") ? parseInt(searchParams.get("maxTime")!) : 180
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
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");

    if (selectedTags.length > 0) params.set("tags", selectedTags.join("|"));
    else params.delete("tags");

    if (difficulty !== "all") params.set("difficulty", difficulty);
    else params.delete("difficulty");

    if (maxTime !== 180) params.set("maxTime", maxTime.toString());
    else params.delete("maxTime");

    if (favoritesOnly) params.set("favorites", "true");
    else params.delete("favorites");

    if (myRecipesOnly) params.set("myRecipes", "true");
    else params.delete("myRecipes");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
    setMaxTime(180);
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
      maxTime: maxTime === 180 ? undefined : maxTime,
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
    search,
    setSearch,
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
    clearFilters,
  };

  return (
    <div className="container mx-auto p-4">
      {/* Sign-in CTA for unauthenticated users */}
      <Unauthenticated>
        <div className="mb-6 mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Browse recipes for free!</h3>
            <p className="text-sm text-muted-foreground">
              Sign up to save favorites, create recipes, and more.
            </p>
          </div>
          <Link href="/sign-up">
            <Button size="sm">
              <LogIn className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
          </Link>
        </div>
      </Unauthenticated>

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pr-6">
          <RecipeFilters {...filterProps} />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Mobile Filters Button */}
          <div className="md:hidden mb-6">
            <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {(selectedTags.length > 0 || difficulty !== "all" || maxTime !== 180 || favoritesOnly || myRecipesOnly) && (
                    <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0.5">
                      Active
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filter Recipes</SheetTitle>
                </SheetHeader>
                <MobileFilterSheet
                  isOpen={isMobileFiltersOpen}
                  onClose={() => setIsMobileFiltersOpen(false)}
                  initialProps={filterProps}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filter Chips */}
          {(debouncedSearch || selectedTags.length > 0 || difficulty !== "all" || maxTime !== 180 || favoritesOnly || myRecipesOnly) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground mr-1">Active filters:</span>
              
              {debouncedSearch && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Search: {debouncedSearch}
                  <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => setSearch("")} />
                </Badge>
              )}
              
              {difficulty !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Difficulty: {difficulty}
                  <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => setDifficulty("all")} />
                </Badge>
              )}
              
              {maxTime !== 180 && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Max Time: {maxTime}m
                  <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => setMaxTime(180)} />
                </Badge>
              )}
              
              {favoritesOnly && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Favorites Only
                  <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => setFavoritesOnly(false)} />
                </Badge>
              )}
              
              {myRecipesOnly && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  My Recipes Only
                  <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => setMyRecipesOnly(false)} />
                </Badge>
              )}
              
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Tag: {tag}
                  <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))} />
                </Badge>
              ))}

              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs text-muted-foreground">
                Clear all
              </Button>
            </div>
          )}

          {/* Recipe Listings */}
          {status === "LoadingFirstPage" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredRecipes?.length === 0 ? (
            <div className="text-center py-12">
              {debouncedSearch || selectedTags.length > 0 || difficulty !== "all" || favoritesOnly || myRecipesOnly ? (
                <div className="flex flex-col items-center gap-4">
                  <SearchX className="h-16 w-16 text-muted-foreground" />
                  <p className="text-xl text-muted-foreground">
                    No recipes found matching your filters.
                  </p>
                  <Button variant="outline" onClick={clearFilters} className="mt-2">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
                  <Authenticated>
                    <p className="text-xl text-muted-foreground">
                      {myRecipesOnly
                        ? "You haven't added any recipes yet."
                        : "No recipes found. Be the first to share one!"}
                    </p>
                    <Link href="/create">
                      <Button size="lg">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Recipe
                      </Button>
                    </Link>
                  </Authenticated>
                  <Unauthenticated>
                    <p className="text-xl text-muted-foreground">
                      No public recipes found yet.
                    </p>
                  </Unauthenticated>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredRecipes?.map((recipe) => (
                  <div key={recipe._id} className="relative group">
                    <Link href={`/recipe/${recipe._id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="line-clamp-1 py-1">
                              {recipe.title}
                            </CardTitle>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {recipe.description}
                          </CardDescription>
                          {recipe.authorName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              By {recipe.authorName}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recipe.tags?.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs px-1 py-0"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {recipe.tags && recipe.tags.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{recipe.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <RecipeImage
                            imageUrl={recipe.imageUrl}
                            title={recipe.title}
                          />
                        </CardContent>
                      </Card>
                    </Link>
                    <Authenticated>
                      <div className="absolute top-2 right-2 z-10">
                        <LikeButton
                          isFavorite={recipe.isFavorite || false}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFavorite({ id: recipe._id });
                          }}
                        />
                      </div>
                    </Authenticated>
                  </div>
                ))}
              </div>

              {status === "CanLoadMore" && (
                <div className="flex justify-center py-8">
                  <Button onClick={() => loadMore(9)} disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Load More
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
        fallback={<div className="container mx-auto p-4">Loading...</div>}
      >
        <HomeContent />
      </Suspense>
    </main>
  );
}

function RecipeImage({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
        <span className="text-muted-foreground">
          {hasError ? "Image Error" : "No Image"}
        </span>
      </div>
    );
  }

  return (
    <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
      <Image
        src={imageUrl}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onError={() => setHasError(true)}
      />
    </div>
  );
}