"use client";

import { useQuery, useMutation, useAction } from "convex/react";
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
import { cn } from "@/lib/utils";
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
  const toggleBatch = useMutation(api.shoppingList.toggleBatch);
  const removeBatch = useMutation(api.shoppingList.removeBatch);
  const clearChecked = useMutation(api.shoppingList.clearChecked);
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
          ? `Sorted into aisles and combined ${merged} duplicate item${merged === 1 ? "" : "s"}`
          : "Sorted into aisles",
        {
          action:
            originals.length > 0
              ? {
                  label: "Undo",
                  onClick: () => restoreShoppingListItems({ items: originals }),
                }
              : undefined,
        }
      );
    } catch (error: any) {
      console.error("Failed to organize:", error);
      toast.error(error.data || error.message || "Failed to organize shopping list.");
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      await addItem({ ingredient: newItem.trim() });
      setNewItem("");
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
        groupTitle = item.recipeTitle ? item.recipeTitle : "General Items";
      } else {
        groupKey = item.category || "Other";
        groupTitle = item.category || "Other";
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
        return a.title.localeCompare(b.title);
      } else {
        if (a.title === "Other") return 1;
        if (b.title === "Other") return -1;
        return a.title.localeCompare(b.title);
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
    <div className="container mx-auto p-4 max-w-2xl">
      <title>CHEF | Shopping List</title>
      <meta name="description" content="Your shopping list for the week" />

      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">Shopping List</h1>
        {items.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!hasChecked}
                onSelect={() => clearChecked()}
              >
                <Eraser className="h-4 w-4" />
                Clear checked
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setShowClearAllDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item (e.g. Milk, Eggs)"
        />
        <Button type="submit" size="icon" aria-label="Add item">
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-3">
          <ShoppingBasket className="h-12 w-12 opacity-50" />
          <p>Your shopping list is empty.</p>
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
                  className={cn(
                    "h-7",
                    groupBy === value &&
                      "bg-background shadow-sm hover:bg-background"
                  )}
                >
                  {value === "category" ? "By aisle" : "By recipe"}
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
                title="Sort into aisles and combine duplicate items"
              >
                {isOrganizing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isOrganizing
                  ? "Organizing..."
                  : cooldown > 0
                  ? `Wait ${cooldown}s`
                  : "Organize"}
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
                        onCheckedChange={() => toggleBatch({ ids: item.ids })}
                        id={item.id}
                      />
                      <label
                        htmlFor={item.id}
                        className={cn(
                          "flex-1 cursor-pointer py-1.5",
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
                        onClick={() => removeBatch({ ids: item.ids })}
                        aria-label={`Remove ${item.ingredient}`}
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
            <AlertDialogTitle>Delete all items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all items from your shopping list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearAll()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
