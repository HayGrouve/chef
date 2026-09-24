"use client";

import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Trash2,
  Heart,
  Edit,
  ShoppingCart,
  Share2,
  PlayCircle,
  Utensils,
  ListOrdered,
  User,
  MoreHorizontal,
  Clock,
  Gauge,
  Flame,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function RecipeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as Id<"recipes">;

  // Use getPublic for unauthenticated users, get for authenticated users
  const publicRecipe = useQuery(api.recipes.getPublic, { id: recipeId });
  const authenticatedRecipe = useQuery(api.recipes.get, { id: recipeId });
  
  // Use the appropriate recipe based on auth status
  const recipe = authenticatedRecipe ?? publicRecipe;
  
  const deleteRecipe = useMutation(api.recipes.remove);
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  const addBatchToShoppingList = useMutation(api.shoppingList.addBatch);
  const removeBatchFromShoppingList = useMutation(api.shoppingList.removeBatch);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  if (recipe === undefined) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="aspect-video w-full rounded-lg" />
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">Recipe not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            This recipe may be private or doesn't exist.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteRecipe({ id: recipeId });
    setShowDeleteDialog(false);
    router.push("/");
  };

  const handleAddToCart = async () => {
    const ids = await addBatchToShoppingList({
      ingredients: recipe.ingredients,
      recipeId: recipe._id,
    });
    toast.success(
      `Added ${recipe.ingredients.length} ingredients to your shopping list`,
      {
        action: ids?.length
          ? {
              label: "Undo",
              onClick: () => removeBatchFromShoppingList({ ids }),
            }
          : undefined,
      }
    );
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/recipe/${recipe._id}`;
    const shareData = {
      title: `CHEF | ${recipe.title}`,
      text: recipe.description,
      url: url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        // Native share sheet opened, no need for feedback
      } catch (err) {
        // User cancelled or it failed, fallback to clipboard
        if ((err as Error).name !== "AbortError") {
          navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard");
        }
      }
    } else {
      // Fallback for desktop/unsupported browsers
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" className="pl-0" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Authenticated>
          <Link href={`/recipe/${recipeId}/cook`}>
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" /> Start Cooking
            </Button>
          </Link>
        </Authenticated>
        <Unauthenticated>
          <Link href="/sign-in">
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" /> Sign In to Cook
            </Button>
          </Link>
        </Unauthenticated>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{recipe.title}</CardTitle>
              {recipe.authorName && (
                <Link
                  href={`/profile/${recipe.userId}`}
                  className="flex items-center text-sm text-muted-foreground gap-1 hover:underline hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4" />
                  <p>Recipe by {recipe.authorName}</p>
                </Link>
              )}
              <p className="text-muted-foreground">{recipe.description}</p>
              {(recipe.cookingTime || recipe.difficulty || recipe.calories) && (
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {recipe.cookingTime ? (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {recipe.cookingTime} min
                    </span>
                  ) : null}
                  {recipe.difficulty && (
                    <span className="flex items-center gap-1.5">
                      <Gauge className="h-4 w-4" />
                      {recipe.difficulty}
                    </span>
                  )}
                  {recipe.calories ? (
                    <span className="flex items-center gap-1.5">
                      <Flame className="h-4 w-4" />
                      {recipe.calories} kcal
                    </span>
                  ) : null}
                </div>
              )}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {recipe.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs px-2 py-0.5"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Authenticated>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-red-500"
                  onClick={() => toggleFavorite({ id: recipeId })}
                  title={
                    recipe.isFavorite
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                >
                  <Heart
                    className={`h-5 w-5 ${recipe.isFavorite ? "fill-red-500 text-red-500" : ""}`}
                  />
                </Button>
              </Authenticated>
              {recipe.isPublic && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={handleShare}
                  title="Share"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              )}
              <Authenticated>
                {recipe.isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/create?edit=${recipeId}`}>
                          <Edit className="h-4 w-4" />
                          Edit recipe
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete recipe
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Authenticated>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {recipe.imageUrl && (
            <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
              <Image
                src={recipe.imageUrl}
                alt={recipe.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Ingredients
                </h3>
                <Authenticated>
                  <Button variant="outline" size="sm" onClick={handleAddToCart}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to list
                  </Button>
                </Authenticated>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i}>{ingredient}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                Instructions
              </h3>
              <ol className="list-decimal pl-5 space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="pl-2">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              recipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function RecipeDetailClient() {
  return <RecipeDetailContent />;
}
