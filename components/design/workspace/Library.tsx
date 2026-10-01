"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Authenticated } from "convex/react";
import { Heart, LayoutGrid, Rows3, Search, SearchX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  COLLECTIONS,
  RecipePhoto,
  formatMinutes,
  inCollection,
  matchesQuery,
  useLibrary,
  useRecipeActions,
  type Collection,
  type LibraryRecipe,
} from "../shared";

type View = "grid" | "list";
type Sort = "newest" | "quickest" | "az";

const VIEW_KEY = "design.workspace.view";
const viewStore = {
  subscribe(cb: () => void) {
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
  },
  get: () => (localStorage.getItem(VIEW_KEY) as View | null) ?? "grid",
  set(view: View) {
    localStorage.setItem(VIEW_KEY, view);
    window.dispatchEvent(new StorageEvent("storage"));
  },
};

export function WorkspaceLibrary() {
  const params = useSearchParams();
  const collection = (params.get("c") as Collection | null) ?? "all";
  const tag = params.get("tag");
  const { recipes, loading } = useLibrary();

  const view = useSyncExternalStore(viewStore.subscribe, viewStore.get, () => "grid" as View);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const title = tag ?? COLLECTIONS.find((c) => c.id === collection)?.label ?? "All recipes";

  const shown = useMemo(() => {
    const list = recipes.filter(
      (r) =>
        (tag ? r.tags?.includes(tag) : inCollection(r, collection)) &&
        (!difficulty || r.difficulty === difficulty) &&
        matchesQuery(r, query)
    );
    if (sort === "quickest") list.sort((a, b) => (a.cookingTime ?? 999) - (b.cookingTime ?? 999));
    if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [recipes, tag, collection, difficulty, query, sort]);

  const filtered = !!query || !!difficulty;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {!loading && (
          <p className="pb-0.5 text-sm text-muted-foreground">
            {shown.length} {shown.length === 1 ? "recipe" : "recipes"}
          </p>
        )}
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${title.toLowerCase()}`}
            aria-label="Filter recipes"
            className="h-9 pl-8 pr-8"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear filter"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={difficulty}
          onValueChange={setDifficulty}
          aria-label="Difficulty"
          className="h-9"
        >
          {["Easy", "Medium", "Hard"].map((d) => (
            <ToggleGroupItem key={d} value={d} className="h-9 px-3 text-sm">
              {d}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="h-9 w-36 max-sm:hidden" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="quickest">Quickest</SelectItem>
            <SelectItem value="az">A to Z</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          variant="outline"
          value={view}
          onValueChange={(v) => v && viewStore.set(v as View)}
          aria-label="View"
          className="h-9"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view" className="h-9 w-9">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="h-9 w-9">
            <Rows3 />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-6">
        {loading ? (
          view === "grid" ? <GridSkeleton /> : <ListSkeleton />
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <SearchX className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="font-medium">{filtered ? "Nothing matches" : "No recipes here yet"}</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {filtered
                ? "Try another word or clear the difficulty filter."
                : collection === "favorites"
                  ? "Tap the heart on a recipe to keep it here."
                  : "Add one with New recipe in the sidebar."}
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((r, i) => (
              <GridItem key={r._id} recipe={r} priority={i < 4} />
            ))}
          </div>
        ) : (
          <ListView recipes={shown} />
        )}
      </div>
    </div>
  );
}

function GridItem({ recipe, priority }: { recipe: LibraryRecipe; priority: boolean }) {
  return (
    <div className="group relative">
      <Link href={`/design/workspace/recipe/${recipe._id}`} className="block">
        <RecipePhoto
          src={recipe.imageUrl}
          alt={recipe.title}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 260px"
          className="aspect-[4/3] rounded-lg ring-1 ring-border transition-[filter] group-hover:brightness-95"
        />
        <h3 className="mt-2.5 line-clamp-1 font-medium">{recipe.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {[formatMinutes(recipe.cookingTime), recipe.difficulty, recipe.authorName && `by ${recipe.authorName}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Link>
      <Authenticated>
        <FavoriteButton recipe={recipe} className="absolute right-2 top-2 bg-background/85 backdrop-blur" />
      </Authenticated>
    </div>
  );
}

function ListView({ recipes }: { recipes: LibraryRecipe[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="hidden grid-cols-[1fr_7rem_6rem_2.5rem] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
        <span>Recipe</span>
        <span>Time</span>
        <span>Difficulty</span>
        <span className="sr-only">Favorite</span>
      </div>
      <ul className="divide-y">
        {recipes.map((r) => (
          <li key={r._id} className="relative grid grid-cols-[1fr_2.5rem] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40 md:grid-cols-[1fr_7rem_6rem_2.5rem]">
            <Link href={`/design/workspace/recipe/${r._id}`} className="flex min-w-0 items-center gap-3 after:absolute after:inset-0">
              <RecipePhoto src={r.imageUrl} alt="" sizes="64px" className="aspect-[4/3] w-16 shrink-0 rounded-md" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  <span className="md:hidden">
                    {[formatMinutes(r.cookingTime), r.difficulty].filter(Boolean).join(" · ")}
                    {(r.tags?.length ?? 0) > 0 && " · "}
                  </span>
                  {(r.tags ?? []).join(", ") || r.description}
                </span>
              </span>
            </Link>
            <span className="hidden font-mono text-sm tabular-nums text-muted-foreground md:block">
              {formatMinutes(r.cookingTime) ?? "-"}
            </span>
            <span className="hidden text-sm text-muted-foreground md:block">{r.difficulty ?? "-"}</span>
            <Authenticated>
              <FavoriteButton recipe={r} className="relative z-10" />
            </Authenticated>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FavoriteButton({ recipe, className }: { recipe: LibraryRecipe; className?: string }) {
  const { toggleFavorite } = useRecipeActions(recipe._id);
  return (
    <button
      onClick={toggleFavorite}
      aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={!!recipe.isFavorite}
      className={cn(
        "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary active:scale-95",
        recipe.isFavorite && "text-primary",
        className
      )}
    >
      <Heart className={cn("size-4", recipe.isFavorite && "fill-current")} />
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/3] rounded-lg" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y rounded-lg border">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="aspect-[4/3] w-16 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
