"use client";

import { useState, useEffect } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Clock, ChefHat, Heart } from "lucide-react";
import Image from "next/image";

import { useDebounce } from "@/hooks/use-debounce";

export function MealSelector({
  isOpen,
  onClose,
  onSelect,
  currentDate,
  currentMealType,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (recipeId: Id<"recipes">) => void;
  currentDate: string | null;
  currentMealType: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Simple debounce
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.recipes.list,
    {
      search: debouncedSearchQuery || undefined,
      favoritesOnly: favoritesOnly,
    },
    { initialNumItems: 10 }
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-full w-full flex-col sm:max-w-[540px]">
        <SheetHeader className="px-6 pt-6 pb-0 mb-0">
          <SheetTitle>Pick a recipe</SheetTitle>
          <SheetDescription>
            {currentDate && currentMealType
              ? `Adding for ${currentMealType} on ${currentDate}`
              : "Choose a recipe to add to your plan"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              autoComplete="off"
              aria-label="Search recipes"
              placeholder="Search recipes…"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="favorites-mode"
              checked={favoritesOnly}
              onCheckedChange={setFavoritesOnly}
            />
            <Label htmlFor="favorites-mode">Favorites only</Label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
          {status === "LoadingFirstPage" ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="sr-only">Loading recipes…</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recipes found.
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {results.map((recipe) => (
                <button
                  type="button"
                  key={recipe._id}
                  className="flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-accent"
                  onClick={() => onSelect(recipe._id)}
                >
                  <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {recipe.imageUrl ? (
                      <Image
                        src={recipe.imageUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <ChefHat className="h-8 w-8 text-muted-foreground/50" />
                      </span>
                    )}
                  </span>
                  <span className="block min-w-0 flex-1">
                    <span className="mb-1 block truncate font-medium leading-none">
                      {recipe.title}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {recipe.cookingTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipe.cookingTime}&nbsp;min
                        </span>
                      )}
                      {recipe.isFavorite && (
                        <span className="flex items-center gap-1 text-primary">
                          <Heart className="h-3 w-3 fill-current" />
                          <span className="sr-only">Favorite</span>
                        </span>
                      )}
                      {recipe.authorName && (
                        <span className="truncate">by {recipe.authorName}</span>
                      )}
                    </span>
                  </span>
                </button>
              ))}

              {status === "CanLoadMore" && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => loadMore(10)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load more
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
