"use client";

// PROTOTYPE — Cook Mode 2.0 error state (e.g. a malformed recipe id in the URL).
import Link from "next/link";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CookModeError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <ChefHat className="h-10 w-10 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Couldn&apos;t open this recipe</h1>
        <p className="text-muted-foreground">The link may be broken or the recipe is no longer available.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/prototype/cook">Pick another recipe</Link>
        </Button>
      </div>
    </div>
  );
}
