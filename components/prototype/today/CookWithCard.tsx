"use client";

// PROTOTYPE — "Cook with what you have": best recipe matches for your staples.
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { shortName } from "./lib";
import { RecipeThumb } from "./parts";

export type Match = {
  _id: string;
  title: string;
  imageUrl: string | null;
  matchCount: number;
  matchPercentage: number;
  missingIngredients: string[];
  ingredients: string[];
};

export function CookWithCard({
  matches,
  hasStaples,
}: {
  matches: Match[] | undefined;
  hasStaples: boolean;
}) {
  return (
    <Card className="h-full gap-3 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold leading-tight">Cook with what you have</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Based on your staples</p>
        </div>
        <Link href="/pantry" className="shrink-0 text-sm font-medium text-primary hover:underline">
          Open pantry search
        </Link>
      </div>

      {!hasStaples ? (
        <p className="text-sm text-muted-foreground">
          Add a few staples and we&apos;ll show what you can make right now.
        </p>
      ) : matches === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recipes use these staples yet.</p>
      ) : (
        <ul className="-mx-2 grid gap-x-4 sm:grid-cols-2">
          {matches.map((m) => {
            const missing = m.missingIngredients.map(shortName);
            return (
              <li key={m._id}>
                <Link
                  href={`/recipe/${m._id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60"
                >
                  <RecipeThumb title={m.title} imageUrl={m.imageUrl} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{m.title}</p>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {m.matchCount}/{m.ingredients.length}
                      </span>
                    </div>
                    <Progress value={m.matchPercentage} className="my-1.5 h-1" />
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {missing.length === 0
                        ? "You have everything"
                        : `Missing: ${missing.slice(0, 3).join(", ")}${
                            missing.length > 3 ? ` +${missing.length - 3}` : ""
                          }`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
