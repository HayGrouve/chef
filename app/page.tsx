"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
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
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Heart, ShoppingCart } from "lucide-react";
import { useMutation } from "convex/react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const recipes = useQuery(api.recipes.list, { 
    search: search === "" ? undefined : search,
  });
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);

  // Extract unique tags from recipes for the filter list
  const allTags = Array.from(new Set(recipes?.flatMap(r => r.tags || []) || [])).sort();

  // Client-side filtering for tags (simpler for now, or update backend)
  const filteredRecipes = recipes?.filter(recipe => 
    !selectedTag || (recipe.tags && recipe.tags.includes(selectedTag))
  );

  return (
    <main className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">CHEF</h1>
        <div className="flex items-center gap-4">
          <AuthLoading>
            <Button disabled>Loading...</Button>
          </AuthLoading>
          <Authenticated>
            <Link href="/meal-planner">
              <Button variant="ghost">Meal Planner</Button>
            </Link>
            <Link href="/shopping-list">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/create">
              <Button>Add Recipe</Button>
            </Link>
            <UserButton />
          </Authenticated>
          <Unauthenticated>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </Unauthenticated>
        </div>
      </header>

      <Authenticated>
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search recipes..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
            {allTags.map(tag => (
              <Badge 
                key={tag}
                variant={selectedTag === tag ? "default" : "secondary"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {recipes === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRecipes?.length === 0 ? (
          <div className="text-center py-12">
            {search || selectedTag ? (
                 <p className="text-xl text-muted-foreground mb-4">
                  No recipes found matching your filters.
                </p>
            ) : (
                <>
                    <p className="text-xl text-muted-foreground mb-4">
                    You haven&apos;t added any recipes yet.
                    </p>
                    <Link href="/create">
                    <Button size="lg">Create Your First Recipe</Button>
                    </Link>
                </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes?.map((recipe) => (
              <div key={recipe._id} className="relative group">
              <Link href={`/recipe/${recipe._id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="line-clamp-1">{recipe.title}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {recipe.description}
                    </CardDescription>
                     <div className="flex flex-wrap gap-1 mt-2">
                      {recipe.tags?.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs px-1 py-0">{tag}</Badge>
                      ))}
                      {recipe.tags && recipe.tags.length > 3 && (
                         <span className="text-xs text-muted-foreground">+{recipe.tags.length - 3}</span>
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
              <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 hover:bg-transparent text-muted-foreground hover:text-red-500"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite({ id: recipe._id });
                  }}
                >
                  <Heart className={`h-5 w-5 ${recipe.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="text-center py-20">
          <h2 className="text-3xl font-semibold mb-4">
            Welcome to Your Personal Cookbook
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Sign in to start storing your favorite recipes.
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Get Started</Button>
          </SignInButton>
        </div>
      </Unauthenticated>
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
  if (!imageUrl) {
    return (
      <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
        <span className="text-muted-foreground">No Image</span>
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
      />
    </div>
  );
}
