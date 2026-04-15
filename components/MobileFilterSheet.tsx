"use client";

import { useState, useEffect } from "react";
import { RecipeFilters, RecipeFiltersProps } from "./RecipeFilters";

export function MobileFilterSheet({
  isOpen,
  onClose,
  initialProps,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialProps: Omit<RecipeFiltersProps, "isMobile" | "onApply">;
}) {
  // Local state for all filters
  const [search, setSearch] = useState(initialProps.search);
  const [difficulty, setDifficulty] = useState(initialProps.difficulty);
  const [maxTime, setMaxTime] = useState(initialProps.maxTime);
  const [favoritesOnly, setFavoritesOnly] = useState(initialProps.favoritesOnly);
  const [myRecipesOnly, setMyRecipesOnly] = useState(initialProps.myRecipesOnly);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialProps.selectedTags);

  // Sync local state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setSearch(initialProps.search);
      setDifficulty(initialProps.difficulty);
      setMaxTime(initialProps.maxTime);
      setFavoritesOnly(initialProps.favoritesOnly);
      setMyRecipesOnly(initialProps.myRecipesOnly);
      setSelectedTags(initialProps.selectedTags);
    }
  }, [isOpen, initialProps]);

  const handleApply = () => {
    initialProps.setSearch(search);
    initialProps.setDifficulty(difficulty);
    initialProps.setMaxTime(maxTime);
    initialProps.setFavoritesOnly(favoritesOnly);
    initialProps.setMyRecipesOnly(myRecipesOnly);
    initialProps.setSelectedTags(selectedTags);
    onClose();
  };

  const handleClear = () => {
    setSearch("");
    setDifficulty("all");
    setMaxTime(180);
    setFavoritesOnly(false);
    setMyRecipesOnly(false);
    setSelectedTags([]);
  };

  return (
    <RecipeFilters
      search={search}
      setSearch={setSearch}
      difficulty={difficulty}
      setDifficulty={setDifficulty}
      maxTime={maxTime}
      setMaxTime={setMaxTime}
      favoritesOnly={favoritesOnly}
      setFavoritesOnly={setFavoritesOnly}
      myRecipesOnly={myRecipesOnly}
      setMyRecipesOnly={setMyRecipesOnly}
      selectedTags={selectedTags}
      setSelectedTags={setSelectedTags}
      allTags={initialProps.allTags}
      clearFilters={handleClear}
      isMobile={true}
      onApply={handleApply}
    />
  );
}