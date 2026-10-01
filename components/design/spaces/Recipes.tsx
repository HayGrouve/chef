"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { Plus, Search, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  COLLECTIONS,
  RecipePhoto,
  formatMinutes,
  inCollection,
  matchesQuery,
  useLibrary,
  type Collection,
  type LibraryRecipe,
} from "../shared";

type Mode = "browse" | "pantry";

export function SpacesRecipes() {
  const { recipes, tags, loading } = useLibrary();
  const { isAuthenticated } = useConvexAuth();
  const [mode, setMode] = useState<Mode>("browse");
  const [collection, setCollection] = useState<Collection>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const shown = useMemo(
    () =>
      recipes.filter(
        (r) => inCollection(r, collection) && (!tag || r.tags?.includes(tag)) && matchesQuery(r, query)
      ),
    [recipes, collection, tag, query]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4 md:pt-8">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Recipes</h1>
        {isAuthenticated && (
          <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Mode">
            {(
              [
                ["browse", "Browse"],
                ["pantry", "What can I make?"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors",
                  mode === id && "bg-card text-foreground shadow-sm"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "pantry" ? (
        <PantryMode />
      ) : (
        <>
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your recipes"
              aria-label="Search recipes"
              className="h-12 w-full rounded-full border bg-card pl-11 pr-11 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="shelf -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {COLLECTIONS.filter((c) => isAuthenticated || c.id === "all" || c.id === "quick").map((c) => (
              <Chip
                key={c.id}
                active={collection === c.id && !tag}
                onClick={() => {
                  setCollection(c.id);
                  setTag(null);
                }}
              >
                {c.label}
              </Chip>
            ))}
            <span className="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden />
            {tags.slice(0, 10).map((t) => (
              <Chip key={t.name} active={tag === t.name} onClick={() => setTag(tag === t.name ? null : t.name)}>
                {t.name}
              </Chip>
            ))}
          </div>

          <div className="mt-8">
            {loading ? (
              <GridSkeleton />
            ) : shown.length === 0 ? (
              <div className="rounded-[var(--radius)] bg-muted px-6 py-16 text-center">
                <p className="text-lg font-medium">Nothing here yet</p>
                <p className="mt-1 text-muted-foreground">
                  {query || tag ? "Try a different search or filter." : "Use the + button to add a recipe."}
                </p>
              </div>
            ) : (
              <div className="grid grid-flow-row-dense grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {shown.map((r, i) => (
                  <Tile key={r._id} recipe={r} featured={i === 0 && !query} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full border px-4 text-sm transition-colors hover:border-foreground/30",
        active ? "border-primary bg-primary text-primary-foreground hover:border-primary" : "bg-card"
      )}
    >
      {children}
    </button>
  );
}

function Tile({ recipe, featured }: { recipe: LibraryRecipe; featured: boolean }) {
  return (
    <Link
      href={`/design/spaces/recipe/${recipe._id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--radius)] bg-card ring-1 ring-border transition-shadow hover:shadow-[0_12px_32px_-12px] hover:shadow-primary/30",
        featured && "col-span-2 row-span-2"
      )}
    >
      <RecipePhoto
        src={recipe.imageUrl}
        alt={recipe.title}
        priority={featured}
        sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
        className={cn("aspect-square w-full", featured && "aspect-auto min-h-56 flex-1")}
      />
      <div className={cn("p-3 md:p-4", featured && "md:p-5")}>
        <h3 className={cn("line-clamp-2 font-medium leading-snug", featured && "text-xl font-semibold md:text-2xl")}>
          {recipe.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {[formatMinutes(recipe.cookingTime), recipe.difficulty].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

function PantryMode() {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const results = useQuery(api.recipes.searchByIngredients, items.length ? { ingredients: items } : "skip");

  const addDraft = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter((s) => s && !items.includes(s));
    if (parts.length) setItems([...items, ...parts]);
    setDraft("");
  };

  return (
    <section className="mt-6">
      <p className="text-muted-foreground">Add what&rsquo;s in your fridge. Recipes that use the most of it come first.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addDraft();
        }}
        className="mt-4 flex min-h-12 max-w-2xl flex-wrap items-center gap-2 rounded-[var(--radius)] border bg-card p-2 focus-within:ring-[3px] focus-within:ring-ring/40"
      >
        {items.map((item) => (
          <span key={item} className="flex h-8 items-center gap-1 rounded-full bg-primary/12 pl-3 pr-1 text-sm text-foreground">
            {item}
            <button
              type="button"
              onClick={() => setItems(items.filter((i) => i !== item))}
              aria-label={`Remove ${item}`}
              className="grid size-6 place-items-center rounded-full hover:bg-primary/20"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={items.length ? "Add another" : "e.g. eggs, feta, spinach"}
          aria-label="Ingredient you have"
          className="h-8 min-w-40 flex-1 bg-transparent px-2 outline-none"
        />
        <button
          type="submit"
          aria-label="Add ingredient"
          className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          disabled={!draft.trim()}
        >
          <Plus className="size-4" />
        </button>
      </form>

      <div className="mt-8">
        {items.length === 0 ? null : results === undefined ? (
          <GridSkeleton />
        ) : results.length === 0 ? (
          <p className="text-muted-foreground">No recipes use those yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {results.slice(0, 12).map((r) => {
              const pct = Math.round(r.matchPercentage);
              return (
                <li key={r._id}>
                  <Link
                    href={`/design/spaces/recipe/${r._id}`}
                    className="flex items-center gap-4 rounded-[var(--radius)] bg-card p-2.5 pr-4 ring-1 ring-border transition-colors hover:ring-primary/40"
                  >
                    <RecipePhoto src={r.imageUrl} alt="" sizes="80px" className="size-20 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {r.missingIngredients.length === 0
                          ? "You have everything"
                          : `Need ${r.missingIngredients.length} more: ${r.missingIngredients.slice(0, 3).join(", ")}`}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums text-primary">{pct}%</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      <Skeleton className="col-span-2 row-span-2 min-h-80 rounded-[var(--radius)]" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="aspect-[4/5] rounded-[var(--radius)]" />
      ))}
    </div>
  );
}
