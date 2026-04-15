"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Authenticated } from "convex/react";

export interface RecipeFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  difficulty: string;
  setDifficulty: (val: string) => void;
  maxTime: number;
  setMaxTime: (val: number) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (val: boolean) => void;
  myRecipesOnly: boolean;
  setMyRecipesOnly: (val: boolean) => void;
  selectedTags: string[];
  setSelectedTags: (val: string[]) => void;
  allTags: string[];
  clearFilters: () => void;
  isMobile?: boolean;
  onApply?: () => void; // Used for mobile manual apply
}

export function RecipeFilters({
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
  isMobile = false,
  onApply,
}: RecipeFiltersProps) {
  const [tagSearch, setTagSearch] = useState("");

  const filteredTags = allTags.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 px-2 text-muted-foreground"
        >
          Clear all
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes or authors..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Max Cooking Time</Label>
            <span className="text-sm text-muted-foreground">
              {maxTime === 180 ? "Any" : `${maxTime} mins`}
            </span>
          </div>
          <Slider
            value={[maxTime]}
            onValueChange={(val) => setMaxTime(val[0])}
            max={180}
            step={5}
            className="py-1"
          />
        </div>

        <Authenticated>
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="favorites-only" className="cursor-pointer">
                Favorites Only
              </Label>
              <Switch
                id="favorites-only"
                checked={favoritesOnly}
                onCheckedChange={setFavoritesOnly}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="my-recipes-only" className="cursor-pointer">
                My Recipes Only
              </Label>
              <Switch
                id="my-recipes-only"
                checked={myRecipesOnly}
                onCheckedChange={setMyRecipesOnly}
              />
            </div>
          </div>
        </Authenticated>

        <div className="space-y-3 pt-2">
          <Label>Tags</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter tags..."
              className="h-8 pl-8 text-sm"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
            {tagSearch && (
              <button
                onClick={() => setTagSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
            {filteredTags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No tags found
              </p>
            ) : (
              filteredTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  />
                  <Label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tag}
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isMobile && onApply && (
        <div className="pt-4 pb-8">
          <Button className="w-full" onClick={onApply}>
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
}