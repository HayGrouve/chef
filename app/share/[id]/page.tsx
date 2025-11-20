"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PublicRecipe() {
  const params = useParams();
  const recipeId = params.id as Id<"recipes">;
  
  // Use the public query which bypasses auth checks but enforces isPublic=true
  const recipe = useQuery(api.recipes.getPublic, { id: recipeId });

  if (recipe === undefined) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (recipe === null) {
    return (
        <div className="container mx-auto p-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Recipe Not Found</h1>
            <p className="mb-4">This recipe might have been deleted or is not public.</p>
            <Link href="/">
                <Button>Go Home</Button>
            </Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
       <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">CHEF</h1>
        <Link href="/">
            <Button variant="outline">Create Your Own</Button>
        </Link>
      </header>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle className="text-3xl">{recipe.title}</CardTitle>
            <p className="text-muted-foreground">{recipe.description}</p>
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
              <h3 className="text-xl font-semibold mb-4">Ingredients</h3>
              <ul className="list-disc pl-5 space-y-2">
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i}>{ingredient}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Instructions</h3>
              <ol className="list-decimal pl-5 space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="pl-2">{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


