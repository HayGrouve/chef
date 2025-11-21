"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RecipeDetail() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as Id<"recipes">;

  const recipe = useQuery(api.recipes.get, { id: recipeId });
  const deleteRecipe = useMutation(api.recipes.remove);
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  const addBatchToShoppingList = useMutation(api.shoppingList.addBatch);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  if (recipe === undefined) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (recipe === null) {
    return <div className="container mx-auto p-4">Recipe not found</div>;
  }

  const handleDelete = async () => {
    await deleteRecipe({ id: recipeId });
    setShowDeleteDialog(false);
    router.push("/");
  };

  const handleAddToCart = async () => {
    await addBatchToShoppingList({
      ingredients: recipe.ingredients,
      recipeId: recipe._id,
    });
    setAddedToCart(true);
    setShowCartDialog(false);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleShare = () => {
    if (recipe.isPublic) {
      const url = `${window.location.origin}/share/${recipe._id}`;
      navigator.clipboard.writeText(url);
      setShareMessage("Public link copied to clipboard!");
    } else {
      setShareMessage(
        "This recipe is private. Edit it to make it public first."
      );
    }
    setShowShareDialog(true);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
        </Button>
        <Link href={`/recipe/${recipeId}/cook`}>
          <Button className="bg-green-600 hover:bg-green-700">
            <PlayCircle className="mr-2 h-4 w-4" /> Start Cooking
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-start">
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
            </div>
            <div className="flex gap-2">
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
                  className={`h-6 w-6 ${recipe.isFavorite ? "fill-red-500 text-red-500" : ""}`}
                />
              </Button>
              {recipe.isPublic && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  title="Copy Public Link"
                >
                  <Share2 className="h-5 w-5 text-blue-500" />
                </Button>
              )}
              <Link href={`/create?edit=${recipeId}`}>
                <Button variant="outline" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCartDialog(true)}
                  disabled={addedToCart}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {addedToCart ? "Added!" : "Add to List"}
                </Button>
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
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

      <AlertDialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Shopping List</AlertDialogTitle>
            <AlertDialogDescription>
              Add all ingredients from this recipe to your shopping list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddToCart}>
              Add Ingredients
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Recipe</DialogTitle>
            <DialogDescription>{shareMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
