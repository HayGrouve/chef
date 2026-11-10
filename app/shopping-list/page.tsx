"use client";

import { once } from "@/hooks/use-single-flight";
import { useQuery, useMutation, useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Plus,
  Eraser,
  ShoppingBasket,
  Sparkles,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { cn, pluralize } from "@/lib/utils";
import { aisleLabel } from "@/lib/labels";
import { Id } from "../../convex/_generated/dataModel";

type AggregatedItem = {
  id: string;
  ids: Id<"shoppingList">[];
  ingredient: string;
  isChecked: boolean;
  count: number;
  recipeId?: Id<"recipes">;
  recipeTitle?: string;
  category?: string;
};

interface GroupedItems {
  [key: string]: {
    id: string;
    title: string;
    items: AggregatedItem[];
  };
}

export default function ShoppingListPage() {
  const items = useQuery(api.shoppingList.listWithDetails);
  const addItem = useMutation(api.shoppingList.add);
  // Show the tick straight away (also while offline, until it syncs)
  const toggleBatch = useMutation(api.shoppingList.toggleBatch).withOptimisticUpdate(
    (localStore, { ids, isChecked }) => {
      const current = localStore.getQuery(api.shoppingList.listWithDetails, {});
      if (current === undefined || isChecked === undefined) return;
      const changed = new Set<string>(ids);
      let delta = 0;
      const next = current.map((item) => {
        if (!changed.has(item._id) || item.isChecked === isChecked) return item;
        delta += isChecked ? -1 : 1;
        return { ...item, isChecked };
      });
      localStore.setQuery(api.shoppingList.listWithDetails, {}, next);
      const badge = localStore.getQuery(api.shoppingList.getBadgeCount, {});
      if (badge !== undefined) localStore.setQuery(api.shoppingList.getBadgeCount, {}, badge + delta);
    }
  );
  const removeBatch = useMutation(api.shoppingList.removeBatch);
  const clearAll = useMutation(api.shoppingList.clearAll);
  const organizeShoppingList = useAction(api.ai.organizeShoppingList);
  const restoreShoppingListItems = useMutation(api.ai.restoreShoppingListItems);

  const [newItem, setNewItem] = useState("");
  const [groupBy, setGroupBy] = useState<"category" | "recipe">("category");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleOrganize = async () => {
    if (!items || items.length === 0) return;

    setIsOrganizing(true);

    try {
      const { merged, originals } = await organizeShoppingList({});
      setCooldown(30);
      toast.success(
        merged > 0
          ? `Подредено по щандове, ${merged === 1 ? "събран 1 повтарящ се продукт" : `събрани ${merged} повтарящи се продукта`}`
          : "Подредено по щандове",
        {
          action:
            originals.length > 0
              ? {
                  label: "Отмени",
                  onClick: once(() => restoreShoppingListItems({ items: originals })),
                }
              : undefined,
        }
      );
    } catch (error: unknown) {
      console.error("Failed to organize:", error);
      const reason =
        error instanceof ConvexError && typeof error.data === "string" ? error.data : null;
      toast.error("Не успях да подредя списъка", {
        description: reason ?? "Опитай пак след минута. Списъкът ти не е променен.",
      });
    } finally {
      setIsOrganizing(false);
    }
  };

  // Load preference from local storage
  useEffect(() => {
    const saved = localStorage.getItem("shoppingListGroupBy");
    if (
      saved &&
      saved !== groupBy &&
      (saved === "category" || saved === "recipe")
    ) {
      // Use setTimeout to avoid synchronous state update warning
      const timer = setTimeout(() => setGroupBy(saved), 0);
      return () => clearTimeout(timer);
    }
  }, [groupBy]);

  const handleSetGroupBy = (value: "category" | "recipe") => {
    setGroupBy(value);
    localStorage.setItem("shoppingListGroupBy", value);
  };

  // Snapshot items before deleting them so the toast can put them back.
  const removeWithUndo = async (ids: Id<"shoppingList">[], message: string) => {
    const doomed = (items ?? []).filter((i) => ids.includes(i._id));
    await removeBatch({ ids });
    toast.success(message, {
      action: {
        label: "Отмени",
        // Undo re-creates deleted rows, so a double click must not run it twice
        onClick: once(() =>
          restoreShoppingListItems({
            items: doomed.map((i) => ({
              id: i._id,
              item: {
                ingredient: i.ingredient,
                isChecked: i.isChecked,
                recipeId: i.recipeId,
                category: i.category,
              },
            })),
          })
        ),
      },
    });
  };

  const handleClearChecked = () => {
    const ids = (items ?? []).filter((i) => i.isChecked).map((i) => i._id);
    if (ids.length) void removeWithUndo(ids, `Махнах ${pluralize(ids.length, "отметнат продукт", "отметнати продукта")}`);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const ingredient = newItem.trim();
    if (!ingredient) return;
    // Clear first so a quick second Enter doesn't add the same item again
    setNewItem("");
    try {
      await addItem({ ingredient });
    } catch (error) {
      setNewItem(ingredient);
      toast.error("Не успях да добавя продукта", {
        description:
          error instanceof ConvexError && typeof error.data === "string"
            ? error.data
            : "Провери връзката си и опитай пак.",
      });
    }
  };

  // Grouping logic
  const sortedGroups = useMemo(() => {
    if (!items) return [];

    const groupedItems: GroupedItems = {};

    items.forEach((item) => {
      let groupKey = "";
      let groupTitle = "";

      if (groupBy === "recipe") {
        groupKey = item.recipeId ? item.recipeId : "general";
        groupTitle = item.recipeTitle ? item.recipeTitle : "Други продукти";
      } else {
        groupKey = item.category || "Other";
        groupTitle = aisleLabel(item.category || "Other");
      }

      if (!groupedItems[groupKey]) {
        groupedItems[groupKey] = {
          id: groupKey,
          title: groupTitle,
          items: [],
        };
      }

      const existingItemIndex = groupedItems[groupKey].items.findIndex(
        (existing) =>
          existing.ingredient.toLowerCase().trim() ===
            item.ingredient.toLowerCase().trim() &&
          existing.isChecked === item.isChecked
      );

      if (existingItemIndex >= 0) {
        groupedItems[groupKey].items[existingItemIndex].ids.push(item._id);
        groupedItems[groupKey].items[existingItemIndex].count++;
      } else {
        groupedItems[groupKey].items.push({
          id: item._id,
          ids: [item._id],
          ingredient: item.ingredient,
          isChecked: item.isChecked,
          count: 1,
          recipeId: item.recipeId,
          recipeTitle: item.recipeTitle,
          category: item.category,
        });
      }
    });

    return Object.values(groupedItems).sort((a, b) => {
      if (groupBy === "recipe") {
        if (a.id === "general") return -1;
        if (b.id === "general") return 1;
        return a.title.localeCompare(b.title, "bg");
      } else {
        if (a.id === "Other") return 1;
        if (b.id === "Other") return -1;
        return a.title.localeCompare(b.title, "bg");
      }
    });
  }, [items, groupBy]);

  if (items === undefined) {
    return (
      <div className="container mx-auto p-4 max-w-2xl space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-full" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const hasChecked = items.some((i) => i.isChecked);

  return (
    <div className="container mx-auto max-w-2xl px-4 pb-16 pt-6 md:pt-10">

      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Списък за пазаруване</h1>
        {items.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Още действия">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!hasChecked}
                onSelect={handleClearChecked}
              >
                <Eraser className="h-4 w-4" />
                Махни отметнатите
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setShowClearAllDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Изтрий всички
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
        <Input
          name="item"
          autoComplete="off"
          aria-label="Добави продукт"
          maxLength={300}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Добави продукт, напр. мляко…"
        />
        <Button type="submit" size="icon" aria-label="Добави">
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-3">
          <ShoppingBasket className="h-12 w-12 opacity-50" />
          <p>Списъкът ти за пазаруване е празен.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex gap-1 bg-muted p-1 rounded-md text-sm">
              {(["category", "recipe"] as const).map((value) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetGroupBy(value)}
                  aria-pressed={groupBy === value}
                  className={cn(
                    "h-7",
                    groupBy === value &&
                      "bg-background shadow-sm hover:bg-background"
                  )}
                >
                  {value === "category" ? "По щандове" : "По рецепти"}
                </Button>
              ))}
            </div>
            {groupBy === "category" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOrganize}
                disabled={isOrganizing || cooldown > 0}
                className="text-primary"
                title="Подреди по щандове и събери повтарящите се продукти"
              >
                {isOrganizing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isOrganizing
                  ? "Подреждам…"
                  : cooldown > 0
                  ? `Изчакай ${cooldown} с`
                  : "Подреди"}
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {sortedGroups.map((group) => (
              <section key={group.id}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {group.title}
                </h2>
                <ul className="divide-y">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 py-1"
                    >
                      <Checkbox
                        checked={item.isChecked}
                        onCheckedChange={(checked) => toggleBatch({ ids: item.ids, isChecked: checked === true })}
                        id={item.id}
                      />
                      <label
                        htmlFor={item.id}
                        className={cn(
                          "min-w-0 flex-1 cursor-pointer py-1.5 [overflow-wrap:anywhere]",
                          item.isChecked && "line-through text-muted-foreground"
                        )}
                      >
                        {item.ingredient}
                        {item.count > 1 && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            ×{item.count}
                          </span>
                        )}
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => removeWithUndo(item.ids, `Махнах ${item.ingredient}`)}
                        aria-label={`Махни ${item.ingredient}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Да изтрия ли всички продукти?</AlertDialogTitle>
            <AlertDialogDescription>
              Всички продукти от списъка за пазаруване ще се изтрият завинаги.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отказ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearAll()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Изтрий всички
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
