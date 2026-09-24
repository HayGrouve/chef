"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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

export const MAX_TIME_ANY = 180;

export interface RecipeFiltersProps {
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
}

export function RecipeFilters({
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
      <div className="space-y-2">
        <Label>Difficulty</Label>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Max time</Label>
          <span className="text-sm text-muted-foreground">
            {maxTime === MAX_TIME_ANY ? "Any" : `${maxTime} min`}
          </span>
        </div>
        <Slider
          value={[maxTime]}
          onValueChange={(val) => setMaxTime(val[0])}
          max={MAX_TIME_ANY}
          step={5}
          className="py-1"
        />
      </div>

      <Authenticated>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="favorites-only" className="cursor-pointer">
              Favorites only
            </Label>
            <Switch
              id="favorites-only"
              checked={favoritesOnly}
              onCheckedChange={setFavoritesOnly}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="my-recipes-only" className="cursor-pointer">
              My recipes only
            </Label>
            <Switch
              id="my-recipes-only"
              checked={myRecipesOnly}
              onCheckedChange={setMyRecipesOnly}
            />
          </div>
        </div>
      </Authenticated>

      {allTags.length > 0 && (
        <div className="space-y-3">
          <Label>Tags</Label>
          {allTags.length > 8 && (
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
                  aria-label="Clear tag filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
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
                    className="text-sm font-normal cursor-pointer leading-none"
                  >
                    {tag}
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
