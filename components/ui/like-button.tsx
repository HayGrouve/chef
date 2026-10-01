"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LikeButton({
  isFavorite,
  onClick,
  className,
}: {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    setIsAnimating(true);
    onClick(e);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFavorite}
      className={cn(
        "relative transition-all hover:scale-110 active:scale-95 hover:bg-transparent",
        className
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-colors duration-300",
          isFavorite
            ? "fill-primary text-primary"
            : "text-muted-foreground hover:text-primary",
          isAnimating && "animate-ping"
        )}
      />
    </Button>
  );
}
