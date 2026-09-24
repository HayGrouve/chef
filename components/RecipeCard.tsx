"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RecipeCardData {
  _id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  tags?: string[];
  authorName?: string;
  cookingTime?: number;
}

export function RecipeCard({
  recipe,
  action,
}: {
  recipe: RecipeCardData;
  /** Optional overlay rendered in the top-right corner of the image (e.g. a like button). */
  action?: React.ReactNode;
}) {
  const tags = recipe.tags ?? [];

  return (
    <div className="relative group h-full">
      <Link href={`/recipe/${recipe._id}`} className="block h-full">
        <Card className="h-full gap-0 py-0 overflow-hidden transition-shadow hover:shadow-lg">
          <RecipeImage imageUrl={recipe.imageUrl} title={recipe.title} />
          <div className="flex flex-col gap-1.5 p-4">
            <h3 className="font-semibold leading-tight line-clamp-1">
              {recipe.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
            {(recipe.authorName || recipe.cookingTime) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {recipe.authorName && (
                  <span className="truncate">By {recipe.authorName}</span>
                )}
                {recipe.cookingTime ? (
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {recipe.cookingTime}m
                  </span>
                ) : null}
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-1.5 py-0 font-normal"
                  >
                    {tag}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
      </Link>
      {action && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-background/80 backdrop-blur-sm">
          {action}
        </div>
      )}
    </div>
  );
}

function RecipeImage({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="aspect-video relative bg-muted">
      {!imageUrl || hasError ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <ChefHat className="h-10 w-10 text-muted-foreground/40" />
        </div>
      ) : (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
