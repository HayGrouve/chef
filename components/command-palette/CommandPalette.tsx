"use client";

// The ⌘K command palette: search recipes, plan them, add to the shopping list
// or jump anywhere. Mounted in the root layout for signed-in users.
import { useCallback, useEffect, useRef, useState } from "react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMutation, useQuery } from "convex/react";
// recipes.list is built on merged index streams, whose pages must be pinned
import { usePaginatedQuery } from "convex-helpers/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  CalendarPlus,
  ChefHat,
  ChevronLeft,
  CookingPot,
  Heart,
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
import { cn, pluralize } from "@/lib/utils";
import {
  DAYS,
  Kbd,
  MEAL_TYPES,
  OPEN_EVENT,
  matches,
  todayName,
  useModKey,
} from "./shared";
import { dayLabel, mealTypeLabel } from "@/lib/labels";

type RecipeRef = { _id: Id<"recipes">; title: string };
type Page = { kind: "recipe" | "plan"; recipe: RecipeRef; prevSearch: string };
type Overview = FunctionReturnType<typeof api.commandPalette.suggestions>;
type Meal = NonNullable<Overview>["meals"][number];

const NAV: { href: string; label: string; icon: LucideIcon; keywords: string }[] = [
  { href: "/", label: "Готви", icon: ChefHat, keywords: "рецепти начало cook recipes home" },
  { href: "/meal-planner", label: "Планирай", icon: Calendar, keywords: "план седмица ястия plan meal planner week" },
  { href: "/shopping-list", label: "Пазарувай", icon: ShoppingCart, keywords: "списък пазаруване купи shop shopping list" },
  // Pantry search now lives in the Готви search box (comma-separated ingredients).
  { href: "/", label: "Какво мога да сготвя?", icon: Refrigerator, keywords: "хладилник продукти имам pantry fridge" },
  { href: "/create", label: "Нова рецепта", icon: PlusSquare, keywords: "напиши създай new create write" },
  { href: "/import", label: "Рецепта от линк или снимка", icon: Sparkles, keywords: "добави постави линк снимка import link photo ai" },
];

const QUICK_ADD = /^\s*(?:добави|add)\s+(.*)$/i;
// "добави в списъка" is someone looking for the action, not an item
const ADD_ACTION_PHRASES = [
  "в списъка за пазаруване",
  "в списъка",
  "to shopping list",
  "to the shopping list",
  "to my shopping list",
  "to list",
];
const isAddActionPhrase = (text: string) => {
  const typed = text.trim().toLowerCase().replace(/\s+/g, " ");
  return typed.length >= 2 && ADD_ACTION_PHRASES.some((phrase) => phrase.startsWith(typed));
};
/** "мляко в списъка" / "в списъка мляко" → "мляко" */
const stripAddActionPhrase = (text: string) => {
  let item = text.trim();
  for (const phrase of ADD_ACTION_PHRASES) {
    const lower = item.toLowerCase();
    if (lower.endsWith(` ${phrase}`)) item = item.slice(0, -phrase.length - 1).trim();
    else if (lower.startsWith(`${phrase} `)) item = item.slice(phrase.length + 1).trim();
  }
  return item;
};

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

  // One action per opening: a second Enter lands before the palette closes
  const ranRef = useRef(false);
  const show = useCallback((initial = "") => {
    ranRef.current = false;
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
  const overview = useQuery(api.commandPalette.suggestions, hasOpened ? {} : "skip");

  const addMeal = useMutation(api.mealPlans.add);
  const removeMeal = useMutation(api.mealPlans.remove);
  const addItem = useMutation(api.shoppingList.add);
  const removeItem = useMutation(api.shoppingList.remove);
  const addItems = useMutation(api.shoppingList.addBatch);
  const removeItems = useMutation(api.shoppingList.removeBatch);
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);

  const fail = (err: unknown) => {
    console.error(err);
    // Server validation messages (e.g. "Your week is full") are worth showing
    const message = err instanceof ConvexError && typeof err.data === "string" ? err.data : null;
    toast.error(message ?? "Нещо се обърка. Опитай пак.");
  };

  /** Close first so the palette feels instant, then do the work. */
  const run = (fn: () => void | Promise<unknown>) => {
    if (ranRef.current) return;
    ranRef.current = true;
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
      toast.success(`В плана: ${dayLabel(day).toLowerCase()}, ${mealTypeLabel(mealType).toLowerCase()}`, {
        description: recipe.title,
        action: { label: "Отмени", onClick: () => void removeMeal({ id }).catch(fail) },
      });
    });

  const quickAdd = (ingredient: string) =>
    run(async () => {
      const id = await addItem({ ingredient });
      toast.success(`Добавих „${ingredient}“ в списъка за пазаруване`, {
        action: { label: "Отмени", onClick: () => void removeItem({ id }).catch(fail) },
      });
    });

  const addIngredients = (recipe: RecipeRef, ingredients: string[]) =>
    run(async () => {
      const ids = await addItems({ ingredients, recipeId: recipe._id });
      toast.success(`Добавих ${pluralize(ids.length, "съставка", "съставки")} в списъка за пазаруване`, {
        description: recipe.title,
        action: { label: "Отмени", onClick: () => void removeItems({ ids }).catch(fail) },
      });
    });

  const favorite = (recipe: RecipeRef, wasFavorite: boolean) =>
    run(async () => {
      await toggleFavorite({ id: recipe._id });
      toast.success(wasFavorite ? "Махнах я от любими" : "Добавих я в любими", {
        description: recipe.title,
        action: {
          label: "Отмени",
          onClick: () => void toggleFavorite({ id: recipe._id }).catch(fail),
        },
      });
    });

  const placeholder = !page
    ? "Търси рецепти и страници или напиши „добави мляко“…"
    : page.kind === "recipe"
      ? "Какво искаш да направиш с нея?"
      : "Избери ден и хранене… (напр. „чет вечеря“)";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[8vh] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[14vh] sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Бързи действия</DialogTitle>
        <DialogDescription className="sr-only">
          Търси рецепти, планирай ястия, добавяй в списъка за пазаруване или отиди на страница.
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
                aria-label="Назад"
                className="rounded p-1 hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-0 truncate">
                {pages.map((p, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1 opacity-60">›</span>}
                    <span className={cn(i === pages.length - 1 && "font-medium text-foreground")}>
                      {p.kind === "recipe" ? p.recipe.title : "В плана"}
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
            aria-label="Търси рецепти и действия"
          />
          <CommandList className="max-h-[min(60vh,420px)]">
            {!page && (
              <RootPage
                search={search}
                overview={overview}
                onGo={go}
                onRecipe={(r) => push("recipe", r)}
                onQuickAdd={quickAdd}
                onStartAdd={() => setSearch("добави ")}
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
  const match = QUICK_ADD.exec(search);
  const quick = match && !isAddActionPhrase(match[1]) ? match : null;
  const q = quick ? "" : search.trim();
  const debounced = useDebounced(q, 200);
  const args = debounced ? { search: debounced } : null;

  // Search "mine" separately so the user's own recipes rank first, then merge
  // with everyone's (which also includes their own private matches).
  const mine = usePaginatedQuery(
    api.recipes.list,
    args ? { ...args, myRecipesOnly: true } : "skip",
    { initialNumItems: 8 }
  );
  const everyone = usePaginatedQuery(api.recipes.list, args ?? "skip", { initialNumItems: 8 });

  if (quick) {
    const text = stripAddActionPhrase(quick[1]);
    return (
      <CommandGroup heading="Списък за пазаруване">
        <CommandItem value="quick-add" disabled={!text} onSelect={() => onQuickAdd(text)}>
          <ShoppingCart />
          {text ? (
            <span>
              Добави <span className="font-medium">„{text}“</span> в списъка за пазаруване
            </span>
          ) : (
            <span className="text-muted-foreground">Напиши продукт, напр. „добави 2 лимона“</span>
          )}
        </CommandItem>
      </CommandGroup>
    );
  }

  const isDark = resolvedTheme === "dark";
  const actions = [
    {
      id: "theme",
      label: isDark ? "Светла тема" : "Тъмна тема",
      icon: isDark ? Sun : Moon,
      keywords: "тема светла тъмна вид toggle theme dark light",
      onSelect: () => setTheme(isDark ? "light" : "dark"),
    },
    {
      id: "add",
      label: "Добави в списъка за пазаруване…",
      icon: ShoppingCart,
      keywords: "добави продукт купи add shop item buy",
      onSelect: onStartAdd,
    },
  ];

  const navItems = NAV.filter((n) => matches(q, n.label, n.keywords));
  const actionItems = actions.filter((a) => matches(q, a.label, a.keywords));

  const staticGroups = (
    <>
      {navItems.length > 0 && (
        <CommandGroup heading="Отиди на">
          {navItems.map(({ href, label, icon: Icon }) => (
            <CommandItem key={label} value={`go:${label}`} onSelect={() => onGo(href)}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {actionItems.length > 0 && (
        <CommandGroup heading="Действия">
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
          <Loader2 className="h-4 w-4 animate-spin" /> Зареждам…
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
          <CommandGroup heading={`Следва · ${dayLabel(today)}`}>
            {upNext.map((m) => (
              <CommandItem
                key={m._id}
                value={`upnext:${m._id}`}
                onSelect={() => onGo(`/recipe/${m.recipe._id}/cook`)}
              >
                <CookingPot />
                <span className="truncate">
                  Готви <span className="font-medium">{m.recipe.title}</span>
                </span>
                <CommandShortcut className="tracking-normal">{mealTypeLabel(m.mealType)}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {recent.length > 0 && (
          <CommandGroup heading="Последните ти рецепти">
            {recent.map((r) => (
              <CommandItem
                key={r._id}
                value={`recent:${r._id}`}
                onSelect={() => onRecipe({ _id: r._id, title: r.title })}
              >
                <UtensilsCrossed />
                <span className="truncate">{r.title}</span>
                {r.cookingTime ? (
                  <CommandShortcut className="tracking-normal">{r.cookingTime}{"\u00A0"}мин</CommandShortcut>
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
        <CommandGroup heading="Рецепти">
          {recipes.map((r) => (
            <CommandItem
              key={r._id}
              value={`recipe:${r._id}`}
              onSelect={() => onRecipe({ _id: r._id, title: r.title })}
            >
              <UtensilsCrossed />
              <span className="truncate">{r.title}</span>
              <CommandShortcut className="tracking-normal">
                {r.own ? (r.cookingTime ? `${r.cookingTime}\u00A0мин` : "") : `от ${r.authorName ?? "някого"}`}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Търся рецепти…
        </div>
      ) : (
        <CommandEmpty>
          Нищо за „{q}“.
          <span className="mt-1 block text-xs text-muted-foreground">
            Съвет: започни с „добави “, за да го сложиш в списъка за пазаруване.
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
      label: "Отвори рецептата",
      icon: BookOpen,
      onSelect: () => onGo(`/recipe/${recipe._id}`),
    },
    {
      id: "cook",
      label: "Готви",
      icon: CookingPot,
      hint: "стъпка по стъпка",
      onSelect: () => onGo(`/recipe/${recipe._id}/cook`),
    },
    { id: "plan", label: "Сложи я в плана…", icon: CalendarPlus, hint: "ден и хранене", onSelect: onPlan },
    {
      id: "shop",
      label: "Съставките в списъка за пазаруване",
      icon: ShoppingCart,
      hint: full ? pluralize(count, "продукт", "продукта") : "",
      disabled: !full || count === 0,
      onSelect: () => full && onAddIngredients(full.ingredients),
    },
    {
      id: "fav",
      label: full?.isFavorite ? "Махни от любими" : "Добави в любими",
      icon: Heart,
      keywords: "любима харесай favorite like",
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
      <CommandEmpty>Няма такова действие.</CommandEmpty>
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
          matches(search, dayLabel(day), mealTypeLabel(mt), day, mt, isToday ? "днес today" : "")
        );
        if (slots.length === 0) return null;
        return (
          <CommandGroup
            key={day}
            heading={
              <span className="flex items-center gap-2">
                {dayLabel(day)}
                {isToday && (
                  <span className="rounded bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Днес
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
                  <span className="w-20 shrink-0">{mealTypeLabel(mt)}</span>
                  <span
                    className={cn(
                      "min-w-0 truncate text-xs text-muted-foreground",
                      planned.length === 0 && "opacity-50"
                    )}
                  >
                    {planned.length ? `+ при ${planned.join(", ")}` : "празно"}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      })}
      <CommandEmpty>Няма такова място. Опитай „чет вечеря“.</CommandEmpty>
    </>
  );
}

function Footer({ nested }: { nested: boolean }) {
  const mod = useModKey();
  return (
    <div className="hidden items-center gap-4 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:flex">
      <span className="flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> избор
      </span>
      <span className="flex items-center gap-1">
        <Kbd>↵</Kbd> отвори
      </span>
      <span className="flex items-center gap-1">
        <Kbd>esc</Kbd> затвори
      </span>
      {nested && (
        <span className="flex items-center gap-1">
          <Kbd>⌫</Kbd> назад
        </span>
      )}
      {mod && (
        <span className="ml-auto flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd> отвори и затвори
        </span>
      )}
    </div>
  );
}
