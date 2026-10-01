"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecipeCardData {
  _id: string;
  title: string;
  imageUrl: string | null;
  authorName?: string;
  cookingTime?: number;
  difficulty?: string;
}

export function formatMinutes(minutes?: number) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** A portrait photo tile: the photo carries the card, text sits underneath. */
export function RecipeCard({
  recipe,
  action,
  className,
  priority,
}: {
  recipe: RecipeCardData;
  /** Optional overlay rendered in the top-right corner of the photo (e.g. a like button). */
  action?: React.ReactNode;
  className?: string;
  priority?: boolean;
}) {
  const meta = [formatMinutes(recipe.cookingTime), recipe.difficulty].filter(Boolean).join(" · ");

  return (
    <div className={cn("group relative", className)}>
      <Link href={`/recipe/${recipe._id}`} className="block">
        <RecipePhoto
          src={recipe.imageUrl}
          alt={recipe.title}
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
          className="aspect-[4/5] rounded-xl"
        />
        <h3 className="mt-3 line-clamp-2 font-display text-lg font-semibold leading-tight tracking-tight decoration-primary decoration-2 underline-offset-4 group-hover:underline">
          {recipe.title}
        </h3>
        {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
        {recipe.authorName && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">by {recipe.authorName}</p>
        )}
      </Link>
      {action && (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-background/85 backdrop-blur-sm">
          {action}
        </div>
      )}
    </div>
  );
}

/** Recipe photo with a quiet chef-hat fallback when there's no image or it fails to load. */
export function RecipePhoto({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {!src || failed ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-muted to-accent text-muted-foreground/40">
          <ChefHat className="size-10" strokeWidth={1.5} />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
