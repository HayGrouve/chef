"use client";

// PROTOTYPE — "Shop for the rest of the week": builds a shopping list from the
// remaining planned meals, skipping staples and items already on the list,
// with a review sheet before anything is added.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ChevronDown, Loader2, ShoppingBasket, Undo2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  WEEK_DAYS,
  buildShopPlan,
  dayIndex,
  mealsForShopping,
  type Meal,
  type OpenItem,
  type ShopLine,
} from "./lib";
import { RecipeThumb } from "./parts";

export function ShopWeekCard({
  meals,
  staples,
  open,
  now,
}: {
  meals: Meal[];
  staples: string[];
  open: OpenItem[];
  now: Date;
}) {
  const [includeEarlier, setIncludeEarlier] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const addBatch = useMutation(api.shoppingList.addBatch);
  const removeBatch = useMutation(api.shoppingList.removeBatch);

  const todayIdx = dayIndex(now);
  const hasEarlier = todayIdx > 0 && meals.some((m) => WEEK_DAYS.indexOf(m.day as never) < todayIdx);
  const range = includeEarlier
    ? "Mon – Sun"
    : todayIdx === 6
      ? "Today"
      : `${WEEK_DAYS[todayIdx].slice(0, 3)} – Sun`;

  const shopMeals = useMemo(
    () => mealsForShopping(meals, now, includeEarlier),
    [meals, now, includeEarlier]
  );
  const plan = useMemo(
    () => buildShopPlan(shopMeals, staples, open),
    [shopMeals, staples, open]
  );
  const allLines = plan.groups.flatMap((g) => g.lines);
  const skipped = allLines.filter((l) => l.status !== "buy");
  const selectedCount = allLines.filter((l) => selected.has(l.key)).length;

  const openSheet = () => {
    setSelected(new Set(allLines.filter((l) => l.status === "buy").map((l) => l.key)));
    setSheetOpen(true);
  };

  const toggle = (key: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const addSelected = async () => {
    const byRecipe = new Map<Id<"recipes">, string[]>();
    for (const line of allLines) {
      if (!selected.has(line.key)) continue;
      byRecipe.set(line.recipeId, [...(byRecipe.get(line.recipeId) ?? []), line.line]);
    }
    if (byRecipe.size === 0) return;
    setAdding(true);
    try {
      const idLists = await Promise.all(
        [...byRecipe].map(([recipeId, ingredients]) => addBatch({ ingredients, recipeId }))
      );
      const ids = idLists.flat();
      setSheetOpen(false);
      toast.success(`Added ${ids.length} item${ids.length === 1 ? "" : "s"} to your shopping list`, {
        action: { label: "Undo", onClick: () => removeBatch({ ids }) },
      });
    } catch {
      toast.error("Couldn't add to your shopping list");
    } finally {
      setAdding(false);
    }
  };

  const { buy, staple, listed } = plan.counts;

  return (
    <Card className="h-full gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <ShoppingBasket className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold leading-tight">
            {includeEarlier ? "Shop for the whole week" : "Shop for the rest of the week"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {range} · {shopMeals.length} meal{shopMeals.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {shopMeals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing planned for the rest of the week.{" "}
          <Link href="/meal-planner" className="font-medium text-primary hover:underline">
            Plan a few meals
          </Link>{" "}
          and we&apos;ll work out what to buy.
        </p>
      ) : (
        <>
          <div>
            <p className="text-3xl font-bold leading-none">
              {buy}
              <span className="ml-1.5 text-base font-medium text-muted-foreground">
                to buy
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {staple} you have · {listed} already on your list
            </p>
          </div>
          <Button onClick={openSheet} className="w-full">
            {buy === 0 ? "Review" : "Review & add"}
          </Button>
        </>
      )}

      {hasEarlier && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <Label htmlFor="include-earlier" className="text-sm font-normal text-muted-foreground">
            Include earlier days
          </Label>
          <Switch
            id="include-earlier"
            checked={includeEarlier}
            onCheckedChange={setIncludeEarlier}
          />
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-5 pr-12">
            <SheetTitle>Review shopping</SheetTitle>
            <SheetDescription>
              {shopMeals.length} meal{shopMeals.length === 1 ? "" : "s"}, {range}. Untick
              anything you don&apos;t need.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {plan.groups
              .filter((g) => g.lines.some((l) => l.status === "buy"))
              .map((g) => (
                <div key={g.recipeId}>
                  <div className="mb-2 flex items-center gap-2.5">
                    <RecipeThumb title={g.title} imageUrl={g.imageUrl} className="h-8 w-8 text-xs" sizes="32px" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold">{g.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {g.slots.join(" · ")}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-0.5">
                    {g.lines
                      .filter((l) => l.status === "buy")
                      .map((l) => (
                        <LineRow
                          key={l.key}
                          line={l}
                          checked={selected.has(l.key)}
                          onChange={(on) => toggle(l.key, on)}
                        />
                      ))}
                  </ul>
                </div>
              ))}

            {buy === 0 && (
              <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                Everything for these meals is a staple or already on your list.
              </p>
            )}

            {skipped.length > 0 && (
              <Collapsible className="rounded-lg border">
                <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium">
                  <span>
                    Skipping {skipped.length} item{skipped.length === 1 ? "" : "s"}
                    <span className="block text-xs font-normal text-muted-foreground">
                      You have them, or they&apos;re already on your list
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="space-y-0.5 border-t p-2">
                    {skipped.map((l) => (
                      <LineRow
                        key={l.key}
                        line={l}
                        checked={selected.has(l.key)}
                        onChange={(on) => toggle(l.key, on)}
                        showRecipe
                      />
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          <SheetFooter className="border-t p-4">
            <Button onClick={addSelected} disabled={selectedCount === 0 || adding}>
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              {selectedCount === 0
                ? "Nothing selected"
                : `Add ${selectedCount} item${selectedCount === 1 ? "" : "s"}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function LineRow({
  line,
  checked,
  onChange,
  showRecipe,
}: {
  line: ShopLine;
  checked: boolean;
  onChange: (on: boolean) => void;
  showRecipe?: boolean;
}) {
  const id = `shop-${line.key}`;
  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60",
          line.status !== "buy" && !checked && "text-muted-foreground"
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          className="mt-0.5"
        />
        <span className="min-w-0 flex-1 text-sm leading-snug">
          {line.line}
          {(showRecipe || line.status !== "buy") && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              {line.status === "staple" && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                  Staple: {line.reason}
                </Badge>
              )}
              {line.status === "listed" && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                  On list: {line.reason}
                </Badge>
              )}
              {checked && line.status !== "buy" && (
                <span className="flex items-center gap-1 text-[11px] text-primary">
                  <Undo2 className="h-3 w-3" /> Adding anyway
                </span>
              )}
              {showRecipe && (
                <span className="text-[11px] text-muted-foreground">{line.recipeTitle}</span>
              )}
            </span>
          )}
        </span>
      </label>
    </li>
  );
}
