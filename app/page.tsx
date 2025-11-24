"use client";

import { Suspense } from "react";
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
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChefHat,
  Plus,
  LogIn,
  SearchX,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import { useMutation } from "convex/react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LikeButton } from "@/components/ui/like-button";
import { InstallDialog } from "@/components/install-dialog";
import { useSearchParams, useRouter } from "next/navigation";

function HomeContent() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("all");
  const [maxTime, setMaxTime] = useState<number>(180); // 3 hours max default
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [myRecipesOnly, setMyRecipesOnly] = useState(false);
  
  // PWA Install Prompt Logic
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome) {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);
        
        // Check local storage to ensure we don't spam (optional, but good UX)
        const hasSeenPrompt = localStorage.getItem("hasSeenInstallPrompt");
        if (!hasSeenPrompt) {
            setShowInstallDialog(true);
            localStorage.setItem("hasSeenInstallPrompt", "true");
        }

        // Clean up URL
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("welcome");
        router.replace(`/?${newParams.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.recipes.list,
    {
      search: search === "" ? undefined : search,
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

  // Client-side filtering for tags
  const filteredRecipes = recipes?.filter(
    (recipe) =>
      !selectedTag || (recipe.tags && recipe.tags.includes(selectedTag))
  );

  return (
    <div className="container mx-auto p-4">
      <Authenticated>
        <div className="relative mb-6 space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search recipes..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex-1 space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Difficulty</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Max Cooking Time: {maxTime} mins</Label>
              <Slider
                value={[maxTime]}
                onValueChange={(val) => setMaxTime(val[0])}
                max={180}
                step={5}
                className="py-4"
              />
            </div>
            <div className="flex-1 space-y-2 flex flex-col justify-center gap-2 pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="favorites-only"
                  checked={favoritesOnly}
                  onCheckedChange={setFavoritesOnly}
                />
                <Label htmlFor="favorites-only">Favorites Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="my-recipes-only"
                  checked={myRecipesOnly}
                  onCheckedChange={setMyRecipesOnly}
                />
                <Label htmlFor="my-recipes-only">My Recipes Only</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <Badge
              variant={selectedTag === null ? "default" : "secondary"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Badge>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "secondary"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() =>
                  setSelectedTag(selectedTag === tag ? null : tag)
                }
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {status === "LoadingFirstPage" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRecipes?.length === 0 ? (
          <div className="text-center py-12">
            {search || selectedTag ? (
              <div className="flex flex-col items-center gap-4">
                <SearchX className="h-16 w-16 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  No recipes found matching your filters.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
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
                  <div className="absolute top-2 right-2 z-10">
                    <LikeButton
                      isFavorite={recipe.isFavorite || false}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite({ id: recipe._id });
                      }}
                    />
                  </div>
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
      </Authenticated>

      <Unauthenticated>
        <div className="text-center py-12 md:py-20 flex flex-col items-center">
          <ChefHat className="h-24 w-24 text-primary mb-6" />
          <h2 className="text-3xl font-semibold mb-4">
            Welcome to Your Personal Cookbook
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Sign in to start storing your favorite recipes.
          </p>
          <Link href="/sign-up">
            <Button size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </Link>
        </div>
      </Unauthenticated>
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
      <Suspense fallback={<div className="container mx-auto p-4">Loading...</div>}>
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
