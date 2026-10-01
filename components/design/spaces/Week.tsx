"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Check, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DAYS, MEALS, RecipePhoto, todayName, useLibrary, type LibraryRecipe } from "../shared";

const MEAL_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;
type Meal = (typeof MEALS)[number];

export function SpacesWeek() {
  const [tab, setTab] = useState<"plan" | "list">("plan");

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4 md:pt-8">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Week</h1>
        <div className="flex rounded-full bg-muted p-1 lg:hidden" role="tablist" aria-label="Show">
          {(
            [
              ["plan", "Meals"],
              ["list", "Shopping list"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground",
                tab === id && "bg-card text-foreground shadow-sm"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className={cn(tab !== "plan" && "max-lg:hidden")}>
          <MealPlan />
        </div>
        <aside className={cn("lg:sticky lg:top-4", tab !== "list" && "max-lg:hidden")}>
          <ShoppingList />
        </aside>
      </div>
    </main>
  );
}

function MealPlan() {
  const week = useQuery(api.mealPlans.getWeek);
  const { recipes } = useLibrary();
  const addBatch = useMutation(api.shoppingList.addBatch);
  const removeBatch = useMutation(api.shoppingList.removeBatch);
  const today = todayName();

  const byId = useMemo(() => new Map(recipes.map((r) => [r._id as string, r])), [recipes]);

  const shopWeek = async () => {
    const ingredients = (week ?? []).flatMap((m) => byId.get(m.recipeId)?.ingredients ?? []);
    if (!ingredients.length) {
      toast.info("Plan some meals first.");
      return;
    }
    const ids = await addBatch({ ingredients });
    toast.success(`Added ${ingredients.length} items to the list`, {
      action: ids?.length ? { label: "Undo", onClick: () => removeBatch({ ids }) } : undefined,
    });
  };

  if (week === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {DAYS.map((d) => (
          <Skeleton key={d} className="h-24 rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  const mealCount = week.length;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground">
          {mealCount === 0 ? "Nothing planned yet." : `${mealCount} ${mealCount === 1 ? "meal" : "meals"} planned`}
        </p>
        <Button variant="outline" className="rounded-full" onClick={shopWeek} disabled={mealCount === 0}>
          <ShoppingBasket />
          Shop for these
        </Button>
      </div>
      <ol className="mt-4 flex flex-col gap-2">
        {DAYS.map((day) => (
          <li
            key={day}
            className={cn(
              "grid gap-3 rounded-[var(--radius)] bg-card p-3 ring-1 ring-border md:grid-cols-[6rem_1fr] md:items-center md:p-4",
              day === today && "ring-2 ring-primary"
            )}
          >
            <p className="flex items-baseline gap-2 md:flex-col md:gap-0">
              <span className="font-semibold">{day}</span>
              {day === today && <span className="text-sm font-medium text-primary">Today</span>}
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              {MEALS.map((meal) => (
                <Slot
                  key={meal}
                  day={day}
                  meal={meal}
                  planned={week.filter((m) => m.date === day && m.mealType.toLowerCase() === meal)}
                  recipes={recipes}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Slot({
  day,
  meal,
  planned,
  recipes,
}: {
  day: string;
  meal: Meal;
  planned: { _id: Id<"mealPlans">; recipeId: Id<"recipes">; recipeTitle?: string; recipeImage: string | null }[];
  recipes: LibraryRecipe[];
}) {
  const remove = useMutation(api.mealPlans.remove);
  const entry = planned[0];

  if (!entry) {
    return (
      <RecipeChooser day={day} meal={meal} recipes={recipes}>
        <button className="flex h-full min-h-14 items-center gap-2 rounded-2xl border border-dashed px-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Plus className="size-4" />
          {MEAL_LABEL[meal]}
        </button>
      </RecipeChooser>
    );
  }

  return (
    <div className="group relative flex min-h-14 items-center gap-2.5 rounded-2xl bg-muted/70 p-1.5 pr-8">
      <RecipePhoto src={entry.recipeImage} alt="" sizes="44px" className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {MEAL_LABEL[meal]}
          {planned.length > 1 && ` +${planned.length - 1}`}
        </p>
        <Link
          href={`/design/spaces/recipe/${entry.recipeId}`}
          className="line-clamp-2 text-sm font-medium leading-tight hover:underline"
        >
          {entry.recipeTitle ?? "Private recipe"}
        </Link>
      </div>
      <button
        onClick={() => remove({ id: entry._id })}
        aria-label={`Remove ${entry.recipeTitle ?? "meal"} from ${day} ${meal}`}
        className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground opacity-100 transition-opacity hover:bg-background hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function RecipeChooser({
  day,
  meal,
  recipes,
  children,
}: {
  day: string;
  meal: Meal;
  recipes: LibraryRecipe[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const add = useMutation(api.mealPlans.add);
  const q = query.trim().toLowerCase();
  const options = recipes.filter((r) => !q || r.title.toLowerCase().includes(q)).slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${MEAL_LABEL[meal]} on ${day}`}
          aria-label="Find a recipe"
          className="h-10 w-full rounded-xl bg-muted px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <ul className="mt-1 max-h-72 overflow-y-auto">
          {options.map((r) => (
            <li key={r._id}>
              <button
                onClick={async () => {
                  await add({ date: day, mealType: MEAL_LABEL[meal], recipeId: r._id });
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left text-sm hover:bg-accent"
              >
                <RecipePhoto src={r.imageUrl} alt="" sizes="36px" className="size-9 shrink-0 rounded-lg" />
                <span className="truncate">{r.title}</span>
              </button>
            </li>
          ))}
          {options.length === 0 && <li className="p-3 text-sm text-muted-foreground">No recipe by that name.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function ShoppingList() {
  const items = useQuery(api.shoppingList.listWithDetails);
  const add = useMutation(api.shoppingList.add);
  const toggle = useMutation(api.shoppingList.toggle);
  const clearChecked = useMutation(api.shoppingList.clearChecked);
  const [draft, setDraft] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, NonNullable<typeof items>>();
    for (const item of items ?? []) {
      if (item.isChecked) continue;
      const key = item.category ?? "Other";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);
  const checked = (items ?? []).filter((i) => i.isChecked);
  const open = (items ?? []).length - checked.length;

  return (
    <section className="rounded-[var(--radius)] bg-card p-4 ring-1 ring-border md:p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Shopping list</h2>
        {items && <span className="text-sm text-muted-foreground">{open} to buy</span>}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          await add({ ingredient: text });
        }}
        className="mt-4 flex items-center gap-2 rounded-full bg-muted p-1 pl-4 focus-within:ring-2 focus-within:ring-ring/40"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item"
          aria-label="Add an item"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Add"
          className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </form>

      {items === undefined ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Empty. Add items above, or use &ldquo;Shop for these&rdquo; to pull in this week&rsquo;s ingredients.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {groups.map(([category, list]) => (
            <div key={category}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{category}</p>
              <ul>
                {list.map((item) => (
                  <ListItem key={item._id} item={item} onToggle={() => toggle({ id: item._id })} />
                ))}
              </ul>
            </div>
          ))}
          {checked.length > 0 && (
            <div className="border-t pt-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">In the cart ({checked.length})</p>
                <button
                  onClick={() => clearChecked({})}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Clear
                </button>
              </div>
              <ul>
                {checked.map((item) => (
                  <ListItem key={item._id} item={item} onToggle={() => toggle({ id: item._id })} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ListItem({
  item,
  onToggle,
}: {
  item: { ingredient: string; isChecked: boolean; recipeTitle?: string };
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        onClick={onToggle}
        aria-pressed={item.isChecked}
        className="flex w-full items-start gap-3 rounded-xl px-1.5 py-1.5 text-left hover:bg-muted/60"
      >
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
            item.isChecked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
          )}
        >
          {item.isChecked && <Check className="size-3" strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className={cn("block text-sm", item.isChecked && "text-muted-foreground line-through")}>
            {item.ingredient}
          </span>
          {item.recipeTitle && !item.isChecked && (
            <span className="block truncate text-xs text-muted-foreground">for {item.recipeTitle}</span>
          )}
        </span>
      </button>
    </li>
  );
}
