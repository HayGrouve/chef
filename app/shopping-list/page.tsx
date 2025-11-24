"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, Eraser, ArrowLeft, ShoppingBasket } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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

  const [newItem, setNewItem] = useState("");
  const [groupBy, setGroupBy] = useState<"category" | "recipe">("category");

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
      <div className="container mx-auto p-4">Loading shopping list...</div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <title>CHEF | Shopping List</title>
      <meta name="description" content="Your shopping list for the week" />
      <Link href="/">
        <Button variant="ghost" className="mb-4 pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Recipes
        </Button>
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Shopping List</CardTitle>
          <div className="flex items-center gap-2">
            {items.some((i) => i.isChecked) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearChecked()}
                className="text-muted-foreground hover:text-foreground"
              >
                <Eraser className="w-4 h-4 mr-2" /> Clear Checked
              </Button>
            )}
            {items.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all items?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove all items from your shopping
                      list.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearAll()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add item (e.g. Milk, Eggs)"
            />
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </form>

          <div className="flex justify-end mb-4">
            <div className="text-sm flex gap-2 bg-muted p-1 rounded-md">
              <Button
                variant={groupBy === "category" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSetGroupBy("category")}
                className={
                  groupBy === "category"
                    ? "bg-background shadow-sm hover:bg-background"
                    : ""
                }
              >
                By Aisle
              </Button>
              <Button
                variant={groupBy === "recipe" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSetGroupBy("recipe")}
                className={
                  groupBy === "recipe"
                    ? "bg-background shadow-sm hover:bg-background"
                    : ""
                }
              >
                By Recipe
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-4">
                <ShoppingBasket className="h-12 w-12 opacity-50" />
                <p>Your shopping list is empty.</p>
              </div>
            ) : (
              sortedGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <h3 className="font-semibold text-lg text-primary/80 border-b pb-1 mb-2">
                    {group.title}
                  </h3>
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={item.isChecked}
                          onCheckedChange={() => toggleBatch({ ids: item.ids })}
                          id={item.id}
                        />
                        <label
                          htmlFor={item.id}
                          className={`flex-1 cursor-pointer ${
                            item.isChecked
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {item.ingredient}
                          {item.count > 1 && (
                            <span className="ml-2 text-sm font-semibold text-muted-foreground">
                              x{item.count}
                            </span>
                          )}
                        </label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeBatch({ ids: item.ids })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
