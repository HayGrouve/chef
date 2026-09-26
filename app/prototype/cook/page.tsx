"use client";

// PROTOTYPE — Cook Mode 2.0 picker: open any recipe in the new or current cook mode.
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import { Clock, CookingPot, ListOrdered, Timer } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { segmentStep } from "@/lib/prototype/recipe-text";

function timerCount(steps: string[]) {
  return steps.reduce((n, s) => n + segmentStep(s).filter((seg) => seg.type === "timer").length, 0);
}

export default function CookPicker() {
  const { results, status, loadMore } = usePaginatedQuery(api.recipes.list, {}, { initialNumItems: 30 });

  // Your own recipes first (the list only sets authorName for other people's).
  const recipes = [...results].sort((a, b) => Number(!!a.authorName) - Number(!!b.authorName));

  return (
    <main className="container mx-auto max-w-5xl p-4 pb-12">
      <div className="my-6 max-w-2xl">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <CookingPot className="h-7 w-7 text-primary" /> Cook Mode 2.0
        </h1>
        <p className="mt-2 text-muted-foreground">
          The same cook mode, fixed where it hurts. You see one step at a time in large type, with the
          ingredients that step needs (scaled) right underneath, so there&apos;s no scrolling back to the
          list. Times in a step (&ldquo;simmer for 10 minutes&rdquo;) are tappable and start named timers, several at
          once. Scale ½× to 3×, go hands-free with voice (&ldquo;next&rdquo;, &ldquo;back&rdquo;, &ldquo;repeat&rdquo;, &ldquo;timer&rdquo;),
          and the screen stays awake even after you switch apps. The ingredients check is optional now,
          and a reload keeps your place. Open a recipe in both versions to compare.
        </p>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No recipes yet. <Link href="/create" className="text-primary underline">Add one</Link> to try cook mode.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => {
            const timers = timerCount(r.steps);
            return (
              <Card key={r._id} className="flex flex-col gap-3 p-4">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 font-semibold leading-snug">{r.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {r.cookingTime ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {r.cookingTime} min
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <ListOrdered className="h-3.5 w-3.5" /> {r.steps.length} steps
                    </span>
                    {timers > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" /> {timers} {timers === 1 ? "timer" : "timers"}
                      </span>
                    )}
                    {r.authorName && (
                      <Badge variant="outline" className="font-normal">
                        by {r.authorName}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/prototype/cook/${r._id}`}>Cook (new)</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/recipe/${r._id}/cook`}>Current</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {status === "CanLoadMore" && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => loadMore(30)}>
            Load more
          </Button>
        </div>
      )}
    </main>
  );
}
