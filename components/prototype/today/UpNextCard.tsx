"use client";

// PROTOTYPE — hero card on the "Today" hub: the next meal to cook, how much of
// it you already have, and one-tap actions. Empty state suggests something to
// cook tonight instead.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Check,
  ChefHat,
  Clock,
  CookingPot,
  Gauge,
  Loader2,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  MEAL_LABEL,
  haveVsMissing,
  matchingListItem,
  shortName,
  type Meal,
  type OpenItem,
} from "./lib";
import { RecipeThumb } from "./parts";

export function UpNextCard({
  meal,
  later,
  staples,
  open,
}: {
  meal: Meal;
  later: Meal[];
  staples: string[];
  open: OpenItem[];
}) {
  const recipe = meal.recipe;
  const addBatch = useMutation(api.shoppingList.addBatch);
  const removeBatch = useMutation(api.shoppingList.removeBatch);
  const [adding, setAdding] = useState(false);

  const { have, missing, total } = useMemo(
    () => haveVsMissing(recipe, staples),
    [recipe, staples]
  );
  // Missing lines that aren't already covered by the open shopping list.
  const toAdd = useMemo(
    () =>
      missing.filter((line) => {
        const i = recipe.ingredients.indexOf(line);
        return !matchingListItem(open, line, recipe.ingredientKeys?.[i]);
      }),
    [missing, open, recipe]
  );
  const onList = missing.length - toAdd.length;

  const addMissing = async () => {
    if (toAdd.length === 0) return;
    setAdding(true);
    try {
      const ids = await addBatch({ ingredients: toAdd, recipeId: recipe._id });
      toast.success(
        `Added ${toAdd.length} item${toAdd.length === 1 ? "" : "s"} for ${recipe.title}`,
        {
          description: onList > 0 ? `${onList} already on your list` : undefined,
          action: { label: "Undo", onClick: () => removeBatch({ ids }) },
        }
      );
    } catch {
      toast.error("Couldn't add to your shopping list");
    } finally {
      setAdding(false);
    }
  };

  const percent = total ? Math.round((have.length / total) * 100) : 0;
  const shownMissing = missing.slice(0, 8);

  return (
    <Card className="gap-0 overflow-hidden py-0 md:flex-row">
      <Link
        href={`/recipe/${recipe._id}`}
        className="relative block aspect-[16/9] md:aspect-auto md:w-2/5 md:shrink-0"
        aria-label={`View ${recipe.title}`}
      >
        {recipe.imageUrl ? (
          <RecipeThumb
            title={recipe.title}
            imageUrl={recipe.imageUrl}
            sizes="(max-width: 768px) 100vw, 40vw"
            className="absolute inset-0 h-full w-full rounded-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
            <ChefHat className="h-14 w-14 text-primary/40" />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Up next · {MEAL_LABEL[meal.mealType] ?? meal.mealType}
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{recipe.title}</h2>
          {(recipe.cookingTime || recipe.difficulty) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {recipe.cookingTime ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {recipe.cookingTime} min
                </span>
              ) : null}
              {recipe.difficulty && (
                <span className="flex items-center gap-1 capitalize">
                  <Gauge className="h-4 w-4" />
                  {recipe.difficulty}
                </span>
              )}
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                You have {have.length} of {total}
              </span>
              {staples.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Add staples to see what you have
                </span>
              )}
            </div>
            <Progress value={percent} className="h-1.5" />
            {missing.length === 0 ? (
              <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                <Check className="h-4 w-4" /> You have everything you need.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {shownMissing.map((line) => (
                  <Badge
                    key={line}
                    variant="outline"
                    className="font-normal"
                    title={line}
                  >
                    {shortName(line)}
                  </Badge>
                ))}
                {missing.length > shownMissing.length && (
                  <span className="self-center text-xs text-muted-foreground">
                    +{missing.length - shownMissing.length} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          <Button asChild className="flex-1 sm:flex-none">
            <Link href={`/prototype/cook/${recipe._id}`}>
              <CookingPot className="h-4 w-4" />
              Start cooking
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <Link href={`/recipe/${recipe._id}`}>View recipe</Link>
          </Button>
          {missing.length > 0 && (
            <Button
              variant="ghost"
              onClick={addMissing}
              disabled={adding || toAdd.length === 0}
              className="w-full sm:w-auto"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : toAdd.length === 0 ? (
                <Check className="h-4 w-4" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {toAdd.length === 0
                ? "Missing items are on your list"
                : `Add ${toAdd.length} missing to list`}
            </Button>
          )}
        </div>

        {later.length > 0 && (
          <p className="border-t pt-3 text-sm text-muted-foreground">
            Later today:{" "}
            {later.map((m, i) => (
              <span key={m._id}>
                {i > 0 && ", "}
                <span className="text-foreground">{MEAL_LABEL[m.mealType]}</span> ·{" "}
                <Link href={`/recipe/${m.recipe._id}`} className="hover:underline">
                  {m.recipe.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </Card>
  );
}

export type Suggestion = {
  _id: Id<"recipes">;
  title: string;
  imageUrl: string | null;
  hint: string;
};

export function UpNextEmpty({
  today,
  isEvening,
  suggestions,
}: {
  today: string;
  isEvening: boolean;
  suggestions: Suggestion[] | undefined;
}) {
  const addMeal = useMutation(api.mealPlans.add);
  const removeMeal = useMutation(api.mealPlans.remove);
  const [pending, setPending] = useState<string | null>(null);

  const cookTonight = async (s: Suggestion) => {
    setPending(s._id);
    try {
      const id = await addMeal({ date: today, mealType: "dinner", recipeId: s._id });
      toast.success(`${s.title} is tonight's dinner`, {
        action: { label: "Undo", onClick: () => removeMeal({ id }) },
      });
    } catch {
      toast.error("Couldn't add it to your plan");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className="gap-4 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">
            {isEvening ? "Nothing planned for tonight" : "Nothing else planned today"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick something and it goes straight onto {today}&apos;s dinner.
          </p>
        </div>
      </div>

      {suggestions === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Save a recipe or add your staples to get suggestions here.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {suggestions.map((s) => (
            <li key={s._id} className="flex items-center gap-3 p-2.5">
              <RecipeThumb title={s.title} imageUrl={s.imageUrl} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/recipe/${s._id}`}
                  className="line-clamp-1 font-medium hover:underline"
                >
                  {s.title}
                </Link>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => cookTonight(s)}
                disabled={pending !== null}
              >
                {pending === s._id && <Loader2 className="h-4 w-4 animate-spin" />}
                Cook tonight
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="link" className="h-auto self-start p-0">
        <Link href="/meal-planner">Plan the week instead</Link>
      </Button>
    </Card>
  );
}
