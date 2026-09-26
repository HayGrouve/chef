"use client";

// PROTOTYPE — the ⌘K command palette itself: search recipes, plan them, add to
// the shopping list or jump anywhere. Mounted by PrototypeCommandPalette.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  CalendarPlus,
  ChefHat,
  ChevronLeft,
  CookingPot,
  FlaskConical,
  Heart,
  LayoutDashboard,
  Loader2,
  Moon,
  PlusSquare,
  Refrigerator,
  ShoppingCart,
  Sparkles,
  Sun,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DAYS,
  Kbd,
  MEAL_TYPES,
  OPEN_EVENT,
  matches,
  todayName,
  useModKey,
} from "./shared";

type RecipeRef = { _id: Id<"recipes">; title: string };
type Page = { kind: "recipe" | "plan"; recipe: RecipeRef; prevSearch: string };
type Overview = FunctionReturnType<typeof api.prototype.today.overview>;
type Meal = NonNullable<Overview>["meals"][number];

const NAV: { href: string; label: string; icon: LucideIcon; keywords: string }[] = [
  { href: "/", label: "Recipes", icon: ChefHat, keywords: "home feed browse" },
  { href: "/meal-planner", label: "Meal planner", icon: Calendar, keywords: "plan week planner" },
  { href: "/shopping-list", label: "Shopping list", icon: ShoppingCart, keywords: "shop groceries buy" },
  { href: "/pantry", label: "Pantry", icon: Refrigerator, keywords: "fridge have stock" },
  { href: "/create", label: "New recipe", icon: PlusSquare, keywords: "create write" },
  { href: "/prototype/import", label: "Import recipe", icon: Sparkles, keywords: "paste link url photo ai" },
  { href: "/prototype/today", label: "Today", icon: LayoutDashboard, keywords: "hub tonight" },
  { href: "/prototype", label: "Prototypes", icon: FlaskConical, keywords: "experiments" },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const QUICK_ADD = /^\s*add\s+(.*)$/i;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  const page = pages.at(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const show = useCallback((initial = "") => {
    setPages([]);
    setSearch(initial);
    setOpen(true);
    setHasOpened(true);
  }, []);

  // ⌘K / Ctrl+K toggles; a window event opens it from buttons (touch devices).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (openRef.current) setOpen(false);
      else show();
    };
    const onOpen = (e: Event) => show((e as CustomEvent<{ search?: string }>).detail?.search ?? "");
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [show]);

  // Subscribe lazily: nothing is fetched until the palette is used once.
  const overview = useQuery(api.prototype.today.overview, hasOpened ? {} : "skip");

  const addMeal = useMutation(api.mealPlans.add);
  const removeMeal = useMutation(api.mealPlans.remove);
  const addItem = useMutation(api.shoppingList.add);
  const removeItem = useMutation(api.shoppingList.remove);
  const addItems = useMutation(api.shoppingList.addBatch);
  const removeItems = useMutation(api.shoppingList.removeBatch);
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);

  const fail = (err: unknown) => {
    console.error(err);
    toast.error("Something went wrong. Please try again.");
  };

  /** Close first so the palette feels instant, then do the work. */
  const run = (fn: () => void | Promise<unknown>) => {
    setOpen(false);
    Promise.resolve()
      .then(fn)
      .catch(fail);
  };
  const go = (href: string) => run(() => router.push(href));

  const push = (kind: Page["kind"], recipe: RecipeRef) => {
    setPages((p) => [...p, { kind, recipe, prevSearch: search }]);
    setSearch("");
  };
  const pop = () => {
    if (!page) return;
    setPages((p) => p.slice(0, -1));
    setSearch(page.prevSearch);
    inputRef.current?.focus();
  };

  const planMeal = (recipe: RecipeRef, day: string, mealType: string) =>
    run(async () => {
      const id = await addMeal({ date: day, mealType, recipeId: recipe._id });
      toast.success(`Planned for ${day} ${mealType}`, {
        description: recipe.title,
        action: { label: "Undo", onClick: () => void removeMeal({ id }).catch(fail) },
      });
    });

  const quickAdd = (ingredient: string) =>
    run(async () => {
      const id = await addItem({ ingredient });
      toast.success(`Added “${ingredient}” to shopping list`, {
        action: { label: "Undo", onClick: () => void removeItem({ id }).catch(fail) },
      });
    });

  const addIngredients = (recipe: RecipeRef, ingredients: string[]) =>
    run(async () => {
      const ids = await addItems({ ingredients, recipeId: recipe._id });
      toast.success(`Added ${ids.length} ingredients to shopping list`, {
        description: recipe.title,
        action: { label: "Undo", onClick: () => void removeItems({ ids }).catch(fail) },
      });
    });

  const favorite = (recipe: RecipeRef, wasFavorite: boolean) =>
    run(async () => {
      await toggleFavorite({ id: recipe._id });
      toast.success(wasFavorite ? "Removed from favorites" : "Added to favorites", {
        description: recipe.title,
        action: {
          label: "Undo",
          onClick: () => void toggleFavorite({ id: recipe._id }).catch(fail),
        },
      });
    });

  const placeholder = !page
    ? "Search recipes, pages, or type “add milk”…"
    : page.kind === "recipe"
      ? "What do you want to do with it?"
      : "Pick a day and meal… (e.g. “thu dinner”)";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[8vh] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[14vh] sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search recipes, plan meals, add to your shopping list or jump to a page.
        </DialogDescription>
        <Command
          shouldFilter={false}
          loop
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !search && page) {
              e.preventDefault();
              pop();
            }
          }}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-item]]:py-2"
        >
          {page && (
            <div className="flex items-center gap-1 border-b px-2 py-1.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={pop}
                aria-label="Back"
                className="rounded p-1 hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-0 truncate">
                {pages.map((p, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1 opacity-60">›</span>}
                    <span className={cn(i === pages.length - 1 && "font-medium text-foreground")}>
                      {p.kind === "recipe" ? p.recipe.title : "Plan it"}
                    </span>
                  </span>
                ))}
              </span>
            </div>
          )}
          <CommandInput
            ref={inputRef}
            value={search}
            onValueChange={setSearch}
            placeholder={placeholder}
            autoFocus
          />
          <CommandList className="max-h-[min(60vh,420px)]">
            {!page && (
              <RootPage
                search={search}
                overview={overview}
                onGo={go}
                onRecipe={(r) => push("recipe", r)}
                onQuickAdd={quickAdd}
                onStartAdd={() => setSearch("add ")}
              />
            )}
            {page?.kind === "recipe" && (
              <RecipePage
                recipe={page.recipe}
                search={search}
                onGo={go}
                onPlan={() => push("plan", page.recipe)}
                onAddIngredients={(ingredients) => addIngredients(page.recipe, ingredients)}
                onFavorite={(was) => favorite(page.recipe, was)}
              />
            )}
            {page?.kind === "plan" && (
              <PlanPage
                search={search}
                meals={overview?.meals}
                onPick={(day, mealType) => planMeal(page.recipe, day, mealType)}
              />
            )}
          </CommandList>
          <Footer nested={!!page} />
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------------ */

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function RootPage({
  search,
  overview,
  onGo,
  onRecipe,
  onQuickAdd,
  onStartAdd,
}: {
  search: string;
  overview: Overview | undefined;
  onGo: (href: string) => void;
  onRecipe: (r: RecipeRef) => void;
  onQuickAdd: (ingredient: string) => void;
  onStartAdd: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const quick = QUICK_ADD.exec(search);
  const q = quick ? "" : search.trim();
  const debounced = useDebounced(q, 200);
  const args = debounced ? { search: debounced } : null;

  // recipes.list only searches public recipes unless myRecipesOnly is set,
  // so search "mine" and "everyone" separately and merge.
  const mine = usePaginatedQuery(
    api.recipes.list,
    args ? { ...args, myRecipesOnly: true } : "skip",
    { initialNumItems: 8 }
  );
  const everyone = usePaginatedQuery(api.recipes.list, args ?? "skip", { initialNumItems: 8 });

  if (quick) {
    const text = quick[1].trim();
    return (
      <CommandGroup heading="Shopping list">
        <CommandItem value="quick-add" disabled={!text} onSelect={() => onQuickAdd(text)}>
          <ShoppingCart />
          {text ? (
            <span>
              Add <span className="font-medium">“{text}”</span> to shopping list
            </span>
          ) : (
            <span className="text-muted-foreground">Type an item, e.g. “add 2 lemons”</span>
          )}
        </CommandItem>
      </CommandGroup>
    );
  }

  const isDark = resolvedTheme === "dark";
  const actions = [
    {
      id: "theme",
      label: isDark ? "Switch to light theme" : "Switch to dark theme",
      icon: isDark ? Sun : Moon,
      keywords: "toggle theme dark light mode appearance",
      onSelect: () => setTheme(isDark ? "light" : "dark"),
    },
    {
      id: "add",
      label: "Add to shopping list…",
      icon: ShoppingCart,
      keywords: "add shop item grocery buy",
      onSelect: onStartAdd,
    },
  ];

  const navItems = NAV.filter((n) => matches(q, n.label, n.keywords));
  const actionItems = actions.filter((a) => matches(q, a.label, a.keywords));

  const staticGroups = (
    <>
      {navItems.length > 0 && (
        <CommandGroup heading="Go to">
          {navItems.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={`go:${href}`} onSelect={() => onGo(href)}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {actionItems.length > 0 && (
        <CommandGroup heading="Actions">
          {actionItems.map(({ id, label, icon: Icon, onSelect }) => (
            <CommandItem key={id} value={`action:${id}`} onSelect={onSelect}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </>
  );

  // ---- No query: suggestions -------------------------------------------
  if (!q) {
    // Wait for the first load so the top suggestion (not "Go to") gets selected.
    if (overview === undefined) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      );
    }
    const today = todayName();
    const upNext = (overview?.meals ?? [])
      .filter((m) => m.day === today)
      .sort(
        (a, b) =>
          MEAL_TYPES.indexOf(a.mealType as (typeof MEAL_TYPES)[number]) -
          MEAL_TYPES.indexOf(b.mealType as (typeof MEAL_TYPES)[number])
      );
    const recent = (overview?.myRecipes ?? []).slice(0, 5);
    return (
      <>
        {upNext.length > 0 && (
          <CommandGroup heading={`Up next · ${today}`}>
            {upNext.map((m) => (
              <CommandItem
                key={m._id}
                value={`upnext:${m._id}`}
                onSelect={() => onGo(`/prototype/cook/${m.recipe._id}`)}
              >
                <CookingPot />
                <span className="truncate">
                  Cook <span className="font-medium">{m.recipe.title}</span>
                </span>
                <CommandShortcut className="tracking-normal">{cap(m.mealType)}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {recent.length > 0 && (
          <CommandGroup heading="Your recent recipes">
            {recent.map((r) => (
              <CommandItem
                key={r._id}
                value={`recent:${r._id}`}
                onSelect={() => onRecipe({ _id: r._id, title: r.title })}
              >
                <UtensilsCrossed />
                <span className="truncate">{r.title}</span>
                {r.cookingTime ? (
                  <CommandShortcut className="tracking-normal">{r.cookingTime} min</CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {staticGroups}
      </>
    );
  }

  // ---- Query: static matches + recipe results ---------------------------
  const seen = new Set<string>();
  const recipes = [
    ...mine.results.map((r) => ({ ...r, own: true })),
    ...everyone.results.map((r) => ({ ...r, own: false })),
  ]
    .filter((r) => (seen.has(r._id) ? false : (seen.add(r._id), true)))
    .slice(0, 10);
  const loading =
    q !== debounced || mine.status === "LoadingFirstPage" || everyone.status === "LoadingFirstPage";

  return (
    <>
      {staticGroups}
      {recipes.length > 0 && !loading && (
        <CommandGroup heading="Recipes">
          {recipes.map((r) => (
            <CommandItem
              key={r._id}
              value={`recipe:${r._id}`}
              onSelect={() => onRecipe({ _id: r._id, title: r.title })}
            >
              <UtensilsCrossed />
              <span className="truncate">{r.title}</span>
              <CommandShortcut className="tracking-normal">
                {r.own ? (r.cookingTime ? `${r.cookingTime} min` : "") : `by ${r.authorName ?? "someone"}`}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching recipes…
        </div>
      ) : (
        <CommandEmpty>
          No results for “{q}”.
          <span className="mt-1 block text-xs text-muted-foreground">
            Tip: start with “add ” to put it on your shopping list.
          </span>
        </CommandEmpty>
      )}
    </>
  );
}

function RecipePage({
  recipe,
  search,
  onGo,
  onPlan,
  onAddIngredients,
  onFavorite,
}: {
  recipe: RecipeRef;
  search: string;
  onGo: (href: string) => void;
  onPlan: () => void;
  onAddIngredients: (ingredients: string[]) => void;
  onFavorite: (wasFavorite: boolean) => void;
}) {
  const full = useQuery(api.recipes.get, { id: recipe._id });
  const count = full?.ingredients.length ?? 0;

  const items = [
    {
      id: "open",
      label: "Open recipe",
      icon: BookOpen,
      onSelect: () => onGo(`/recipe/${recipe._id}`),
    },
    {
      id: "cook",
      label: "Cook",
      icon: CookingPot,
      hint: "step by step",
      onSelect: () => onGo(`/prototype/cook/${recipe._id}`),
    },
    { id: "plan", label: "Plan it…", icon: CalendarPlus, hint: "day & meal", onSelect: onPlan },
    {
      id: "shop",
      label: "Add ingredients to shopping list",
      icon: ShoppingCart,
      hint: full ? `${count} items` : "",
      disabled: !full || count === 0,
      onSelect: () => full && onAddIngredients(full.ingredients),
    },
    {
      id: "fav",
      label: full?.isFavorite ? "Remove from favorites" : "Add to favorites",
      icon: Heart,
      keywords: "favorite star like",
      disabled: !full,
      onSelect: () => full && onFavorite(full.isFavorite),
    },
  ].filter((i) => matches(search, i.label, i.keywords));

  return (
    <>
      <CommandGroup heading={recipe.title}>
        {items.map(({ id, label, icon: Icon, hint, disabled, onSelect }) => (
          <CommandItem key={id} value={id} disabled={disabled} onSelect={onSelect}>
            <Icon className={cn(id === "fav" && full?.isFavorite && "fill-primary text-primary")} />
            {label}
            {hint && <CommandShortcut className="tracking-normal">{hint}</CommandShortcut>}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandEmpty>No matching action.</CommandEmpty>
    </>
  );
}

function PlanPage({
  search,
  meals,
  onPick,
}: {
  search: string;
  meals: Meal[] | undefined;
  onPick: (day: string, mealType: string) => void;
}) {
  const today = todayName();
  const start = Math.max(0, DAYS.indexOf(today as (typeof DAYS)[number]));
  // Today first, then the rest of the week in order.
  const days = [...DAYS.slice(start), ...DAYS.slice(0, start)];

  return (
    <>
      {days.map((day) => {
        const isToday = day === today;
        const slots = MEAL_TYPES.filter((mt) =>
          matches(search, day, mt, isToday ? "today" : "")
        );
        if (slots.length === 0) return null;
        return (
          <CommandGroup
            key={day}
            heading={
              <span className="flex items-center gap-2">
                {day}
                {isToday && (
                  <span className="rounded bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Today
                  </span>
                )}
              </span>
            }
          >
            {slots.map((mt) => {
              const planned = (meals ?? [])
                .filter((m) => m.day === day && m.mealType === mt)
                .map((m) => m.recipe.title);
              return (
                <CommandItem
                  key={mt}
                  value={`${day}-${mt}`}
                  onSelect={() => onPick(day, mt)}
                >
                  <span className="w-20 shrink-0">{cap(mt)}</span>
                  <span
                    className={cn(
                      "min-w-0 truncate text-xs text-muted-foreground",
                      planned.length === 0 && "opacity-50"
                    )}
                  >
                    {planned.length ? `+ with ${planned.join(", ")}` : "empty"}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      })}
      <CommandEmpty>No matching slot. Try “thu dinner”.</CommandEmpty>
    </>
  );
}

function Footer({ nested }: { nested: boolean }) {
  const mod = useModKey();
  return (
    <div className="hidden items-center gap-4 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:flex">
      <span className="flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> navigate
      </span>
      <span className="flex items-center gap-1">
        <Kbd>↵</Kbd> select
      </span>
      <span className="flex items-center gap-1">
        <Kbd>esc</Kbd> close
      </span>
      {nested && (
        <span className="flex items-center gap-1">
          <Kbd>⌫</Kbd> back
        </span>
      )}
      {mod && (
        <span className="ml-auto flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd> toggle
        </span>
      )}
    </div>
  );
}
