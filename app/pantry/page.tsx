"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ChefHat, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function PantryPage() {
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);

  // Fetch matching recipes based on ingredients
  // Only fetch if we have ingredients to search for
  const matchingRecipes = useQuery(api.recipes.searchByIngredients, {
    ingredients: ingredients,
  });

  const handleAddIngredient = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newIng = ingredientInput.trim();
      if (newIng && !ingredients.includes(newIng)) {
        setIngredients([...ingredients, newIng]);
        setIngredientInput("");
      }
    }
  };

  const addIngredient = () => {
    const newIng = ingredientInput.trim();
    if (newIng && !ingredients.includes(newIng)) {
      setIngredients([...ingredients, newIng]);
      setIngredientInput("");
    }
  };

  const removeIngredient = (e: React.MouseEvent, ingToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIngredients(ingredients.filter((i) => i !== ingToRemove));
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <title>CHEF | Pantry</title>
      <meta
        name="description"
        content="Find recipes based on your pantry ingredients"
      />
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-muted rounded-full mb-4">
          <ChefHat className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">What can I cook?</h1>
        <p className="text-muted-foreground">
          Enter the ingredients you have, and we&apos;ll find recipes you can
          make.
        </p>
      </div>

      <Card className="mb-10">
        <CardHeader>
          <CardTitle>Your Pantry</CardTitle>
          <CardDescription>
            Add ingredients you have on hand (e.g., eggs, flour, tomatoes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={handleAddIngredient}
              placeholder="Type an ingredient and press Enter..."
              className="flex-1"
            />
            <Button onClick={addIngredient}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-8">
            {ingredients.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No ingredients added yet.
              </p>
            )}
            {ingredients.map((ing) => (
              <Badge
                key={ing}
                variant="secondary"
                className="px-3 py-1 text-base flex items-center gap-2"
              >
                {ing}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => removeIngredient(e, ing)}
                  className="h-auto w-auto p-0 ml-1 hover:text-destructive focus:text-destructive"
                  aria-label={`Remove ${ing}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">
          Matching Recipes
          {matchingRecipes && matchingRecipes.length > 0 && (
            <span className="ml-2 text-muted-foreground text-base font-normal">
              ({matchingRecipes.length} found)
            </span>
          )}
        </h2>

        {ingredients.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">
              Add some ingredients above to see matching recipes!
            </p>
          </div>
        ) : matchingRecipes === undefined ? (
          <div className="text-center py-12">Loading matches...</div>
        ) : matchingRecipes.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">
              No recipes found matching these ingredients.
            </p>
            <Link href="/create">
              <Button variant="link" className="mt-2">
                Create a new recipe?
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matchingRecipes.map((recipe) => (
              <Link href={`/recipe/${recipe._id}`} key={recipe._id}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                  <div className="flex flex-col h-full">
                    {recipe.imageUrl && (
                      <div className="relative h-48 w-full bg-muted">
                        <Image
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start pt-4">
                        <CardTitle className="line-clamp-1 py-1">
                          {recipe.title}
                        </CardTitle>
                        <Badge
                          variant={
                            recipe.matchPercentage === 100
                              ? "default"
                              : "secondary"
                          }
                        >
                          {Math.round(recipe.matchPercentage)}% Match
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {recipe.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-green-600 mb-1">
                            You have ({recipe.matchCount}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {recipe.matchingIngredients
                              .slice(0, 5)
                              .map((ing, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded dark:bg-green-900 dark:text-green-100"
                                >
                                  {ing}
                                </span>
                              ))}
                            {recipe.matchingIngredients.length > 5 && (
                              <span className="text-xs text-muted-foreground">
                                +{recipe.matchingIngredients.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>

                        {recipe.missingIngredients.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-1">
                              Missing ({recipe.missingIngredients.length}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {recipe.missingIngredients
                                .slice(0, 3)
                                .map((ing, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded dark:bg-red-900 dark:text-red-100"
                                  >
                                    {ing}
                                  </span>
                                ))}
                              {recipe.missingIngredients.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{recipe.missingIngredients.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
