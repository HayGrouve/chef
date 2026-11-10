"use client";

// Cook mode error state (e.g. a malformed recipe id in the URL).
import Link from "next/link";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CookModeError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <ChefHat className="h-10 w-10 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Не успях да отворя рецептата</h1>
        <p className="text-muted-foreground">Линкът може да е грешен или рецептата вече да не е достъпна.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Опитай пак
        </Button>
        <Button asChild>
          <Link href="/">Към рецептите</Link>
        </Button>
      </div>
    </div>
  );
}
