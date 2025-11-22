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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

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
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="px-6 pt-6 pb-0 mb-0">
          <SheetTitle>Select Meal</SheetTitle>
          <SheetDescription>
            {currentDate && currentMealType
              ? `Adding for ${currentMealType} on ${currentDate}`
              : "Choose a recipe to add to your plan"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
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
            <Label htmlFor="favorites-mode">Favorites Only</Label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {status === "LoadingFirstPage" ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recipes found.
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {results.map((recipe) => (
                <div
                  key={recipe._id}
                  className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onSelect(recipe._id)}
                >
                  <div className="h-16 w-16 relative rounded-md overflow-hidden shrink-0 bg-muted">
                    {recipe.imageUrl ? (
                      <Image
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full">
                        <ChefHat className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium leading-none mb-1 truncate">
                      {recipe.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {recipe.cookingTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipe.cookingTime}m
                        </span>
                      )}
                      {recipe.isFavorite && (
                        <span className="flex items-center gap-1 text-red-500">
                          <Heart className="h-3 w-3 fill-current" />
                        </span>
                      )}
                      {recipe.authorName && (
                        <span className="truncate">by {recipe.authorName}</span>
                      )}
                    </div>
                  </div>
                </div>
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
                  Load More
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
