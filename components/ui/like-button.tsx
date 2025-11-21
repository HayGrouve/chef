"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function LikeButton({ 
    isFavorite, 
    onClick, 
    className 
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
        <button
            onClick={handleClick}
            className={cn(
                "relative transition-all hover:scale-110 active:scale-95",
                className
            )}
        >
            <Heart
                className={cn(
                    "h-6 w-6 transition-colors duration-300",
                    isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500",
                    isAnimating && "animate-ping"
                )}
            />
        </button>
    );
}

