"use client";

// PROTOTYPE — "Today" kitchen hub: a signed-in home built around plan → shop → cook.
import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ShoppingCart } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNow, useStaples } from "@/components/prototype/today/hooks";
import {
  WEEK_DAYS,
  currentSlot,
  dayIndex,
  greeting,
  pickUpNext,
} from "@/components/prototype/today/lib";
import { UpNextCard, UpNextEmpty, type Suggestion } from "@/components/prototype/today/UpNextCard";
import { WeekStrip } from "@/components/prototype/today/WeekStrip";
import { ShopWeekCard } from "@/components/prototype/today/ShopWeekCard";
import { StaplesCard } from "@/components/prototype/today/StaplesCard";
import { CookWithCard } from "@/components/prototype/today/CookWithCard";
import { RecipeShelf } from "@/components/prototype/today/RecipeShelf";
import { GettingStarted } from "@/components/prototype/today/GettingStarted";
import { TodaySkeleton } from "@/components/prototype/today/TodaySkeleton";

export default function TodayPage() {
  const overview = useQuery(api.prototype.today.overview);
  const now = useNow();
  const { staples, add, remove, restore } = useStaples();
  const rawMatches = useQuery(
    api.recipes.searchByIngredients,
    staples.length > 0 ? { ingredients: staples } : "skip"
  );

  const matches = useMemo(
    () =>
      rawMatches
        ? [...rawMatches]
            .sort(
              (a, b) =>
                b.matchPercentage - a.matchPercentage || b.matchCount - a.matchCount
            )
            .slice(0, 4)
        : undefined,
    [rawMatches]
  );

  const today = now ? WEEK_DAYS[dayIndex(now)] : null;

  const upNext = useMemo(
    () => (overview && now ? pickUpNext(overview.meals, now) : null),
    [overview, now]
  );

  // Empty-hero suggestions: best "cook with what you have" matches first, then
  // quick (≤30 min) recipes of your own, then anything of your own.
  const suggestions = useMemo<Suggestion[] | undefined>(() => {
    if (!overview || !today) return undefined;
    if (staples.length > 0 && matches === undefined) return undefined;
    const plannedToday = new Set(
      overview.meals.filter((m) => m.day === today).map((m) => m.recipe._id as string)
    );
    const picks: Suggestion[] = [];
    const push = (s: Suggestion) => {
      if (picks.length < 3 && !plannedToday.has(s._id) && !picks.some((p) => p._id === s._id))
        picks.push(s);
    };
    for (const m of matches ?? []) {
      push({
        _id: m._id,
        title: m.title,
        imageUrl: m.imageUrl,
        hint: `You have ${m.matchCount} of ${m.ingredients.length} ingredients`,
      });
    }
    const own = [...overview.myRecipes].sort(
      (a, b) => (a.cookingTime ?? 999) - (b.cookingTime ?? 999)
    );
    for (const r of own) {
      push({
        _id: r._id,
        title: r.title,
        imageUrl: r.imageUrl,
        hint:
          r.cookingTime && r.cookingTime <= 30
            ? `Quick · ${r.cookingTime} min`
            : r.cookingTime
              ? `${r.cookingTime} min`
              : "From your cookbook",
      });
    }
    return picks;
  }, [overview, today, staples.length, matches]);

  if (overview === undefined || now === null || today === null) {
    return (
      <main className="container mx-auto p-4 pb-12">
        <title>CHEF | Today</title>
        <div className="mt-4">
          <TodaySkeleton />
        </div>
      </main>
    );
  }

  if (overview === null) {
    return (
      <main className="container mx-auto max-w-md p-4">
        <title>CHEF | Today</title>
        <Card className="mt-10 items-center gap-3 p-8 text-center">
          <h1 className="text-xl font-semibold">Sign in to see your kitchen</h1>
          <p className="text-sm text-muted-foreground">
            Your plan, shopping list and recipes live here once you&apos;re signed in.
          </p>
          <Button asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const isNewUser = overview.myRecipes.length === 0 && overview.meals.length === 0;
  const openCount = overview.shopping.open.length;
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="container mx-auto p-4 pb-12">
      <title>CHEF | Today</title>

      {/* 1. Header */}
      <header className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {greeting(now)}
            {overview.firstName ? `, ${overview.firstName}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">{dateLabel}</p>
        </div>
        <Link
          href="/shopping-list"
          className="flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm shadow-xs transition-colors hover:border-primary hover:text-primary"
        >
          <ShoppingCart className="h-4 w-4" />
          {openCount === 0
            ? "Shopping list is clear"
            : `${openCount} item${openCount === 1 ? "" : "s"} to buy`}
        </Link>
      </header>

      {/* Mobile order: hero → week → shop → staples → cook-with.
          Desktop: hero + shop side by side, week strip full width, then pantry. */}
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-y-8">
        <div className="order-1 min-w-0 lg:col-span-2">
          {isNewUser ? (
            <GettingStarted hasRecipes={false} hasMeals={false} hasStaples={staples.length > 0} />
          ) : upNext?.next ? (
            <UpNextCard
              meal={upNext.next}
              later={upNext.later}
              staples={staples}
              open={overview.shopping.open}
            />
          ) : (
            <UpNextEmpty
              today={today}
              isEvening={currentSlot(now) === "dinner"}
              suggestions={suggestions}
            />
          )}
        </div>

        {!isNewUser && (
          <div className="order-3 min-w-0 lg:order-2 lg:col-span-1">
            <ShopWeekCard
              meals={overview.meals}
              staples={staples}
              open={overview.shopping.open}
              now={now}
            />
          </div>
        )}

        {!isNewUser && (
          <div className="order-2 min-w-0 lg:order-3 lg:col-span-3">
            <WeekStrip meals={overview.meals} now={now} />
          </div>
        )}

        <div id="staples" className="order-4 min-w-0 scroll-mt-20 lg:col-span-1">
          <StaplesCard staples={staples} onAdd={add} onRemove={remove} onRestore={restore} />
        </div>
        <div className={isNewUser ? "order-5 min-w-0 lg:col-span-3" : "order-5 min-w-0 lg:col-span-2"}>
          <CookWithCard matches={matches} hasStaples={staples.length > 0} />
        </div>
      </div>

      {/* Browse — deliberately secondary */}
      <div className="mt-12 space-y-10">
        <RecipeShelf
          title="Your cookbook"
          description={`${overview.myRecipes.length}${overview.myRecipes.length >= 12 ? "+" : ""} recipes · ${overview.favoriteCount} favorites`}
          href="/?myRecipes=true"
          linkLabel="All recipes"
          recipes={overview.myRecipes}
        />
        <RecipeShelf
          title="Discover"
          description="New from other cooks"
          href="/"
          linkLabel="Browse all"
          recipes={overview.discover}
        />
      </div>
    </main>
  );
}
