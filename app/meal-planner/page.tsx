"use client";

import { useState, useSyncExternalStore } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Sparkles,
  MoreHorizontal,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { MealSelector } from "@/components/meal-planner/MealSelector";
import Image from "next/image";
import { Id, Doc } from "../../convex/_generated/dataModel";
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
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type PlannedMeal = Doc<"mealPlans"> & {
  recipeTitle?: string;
  recipeImage?: string | null;
};

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];

function todayName() {
  // getDay(): 0 = Sunday
  return WEEK_DAYS[(new Date().getDay() + 6) % 7];
}

function subscribeToDesktop(callback: () => void) {
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

// Only one layout is mounted at a time so drag/drop ids stay unique.
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true
  );
}

function DraggableMeal({
  meal,
  onRemove,
}: {
  meal: PlannedMeal;
  onRemove: (id: Id<"mealPlans">) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: meal._id,
      data: { meal },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 rounded-md border bg-background p-1.5 pr-7 shadow-xs",
        isDragging && "opacity-60 shadow-lg"
      )}
    >
      {/* Drag handle wraps the content so the remove button is not draggable */}
      <div
        {...listeners}
        {...attributes}
        className="flex min-w-0 flex-1 items-center gap-2 touch-none cursor-grab active:cursor-grabbing"
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-muted pointer-events-none">
          {meal.recipeImage && (
            <Image
              src={meal.recipeImage}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          )}
        </div>
        <Link
          href={`/recipe/${meal.recipeId}`}
          className="text-sm font-medium leading-tight line-clamp-2 hover:underline"
        >
          {meal.recipeTitle}
        </Link>
      </div>
      <button
        onClick={() => onRemove(meal._id)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Remove ${meal.recipeTitle ?? "meal"}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MealSlot({
  day,
  mealType,
  meals,
  onAdd,
  onRemove,
  showLabel,
}: {
  day: string;
  mealType: string;
  meals: PlannedMeal[];
  onAdd: () => void;
  onRemove: (id: Id<"mealPlans">) => void;
  showLabel?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${day}:${mealType}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-1.5 rounded-md p-1.5 min-h-12 transition-colors",
        isOver && "bg-primary/10 ring-2 ring-primary/40"
      )}
    >
      {showLabel && (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {mealType}
        </span>
      )}
      {meals.map((meal) => (
        <DraggableMeal key={meal._id} meal={meal} onRemove={onRemove} />
      ))}
      <button
        onClick={onAdd}
        className={cn(
          "flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary",
          meals.length > 0 && "border-transparent"
        )}
        aria-label={`Add ${mealType.toLowerCase()} on ${day}`}
      >
        <Plus className="h-3.5 w-3.5" />
        {meals.length === 0 && <span>Add</span>}
      </button>
    </div>
  );
}

function DayTab({
  day,
  isSelected,
  hasMeals,
  isToday,
  onSelect,
}: {
  day: string;
  isSelected: boolean;
  hasMeals: boolean;
  isToday: boolean;
  onSelect: () => void;
}) {
  // Dropping a meal on a tab moves it to that day (keeping its meal type)
  const { setNodeRef, isOver } = useDroppable({ id: `tab:${day}` });

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      className={cn(
        "relative flex flex-1 flex-col items-center rounded-md py-2 text-sm font-medium transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
        isOver && "ring-2 ring-primary"
      )}
      aria-pressed={isSelected}
    >
      <span className={cn(isToday && !isSelected && "text-primary")}>
        {day.slice(0, 3)}
      </span>
      <span
        className={cn(
          "mt-1 h-1 w-1 rounded-full",
          hasMeals
            ? isSelected
              ? "bg-primary-foreground"
              : "bg-primary"
            : "bg-transparent"
        )}
      />
    </button>
  );
}

export default function MealPlannerPage() {
  // CHANGED: No arguments needed for getWeek
  const mealPlans = useQuery(api.mealPlans.getWeek, {});

  const recipes = useQuery(api.recipes.listAll, {});
  const addMeal = useMutation(api.mealPlans.add);
  const removeMeal = useMutation(api.mealPlans.remove);
  const moveMeal = useMutation(api.mealPlans.move);
  const addBatchToShoppingList = useMutation(api.shoppingList.addBatch);
  const removeBatchFromShoppingList = useMutation(api.shoppingList.removeBatch);
  const autoGenerate = useMutation(api.mealPlans.autoGenerate);
  const generateMealPlanWithAI = useAction(api.ai.generateMealPlanWithAI);
  const clearAll = useMutation(api.mealPlans.clearAll);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>("dinner");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isDesktop = useIsDesktop();
  const [mobileDay, setMobileDay] = useState(todayName);
  const today = todayName();

  const sensors = useSensors(
    // Small drag threshold so taps on the recipe link still navigate
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const mealsFor = (day: string, mealType?: string) =>
    mealPlans?.filter(
      (p) =>
        p.date === day &&
        (mealType === undefined || p.mealType === mealType.toLowerCase())
    ) ?? [];

  const openAdd = (day: string, mealType: string) => {
    setSelectedDate(day);
    setSelectedMealType(mealType);
    setIsAddDialogOpen(true);
  };

  const handleRemove = (id: Id<"mealPlans">) => removeMeal({ id });

  const handleAddMeal = async (recipeId: string) => {
    if (selectedDate && selectedMealType) {
      await addMeal({
        date: selectedDate,
        mealType: selectedMealType.toLowerCase(),
        recipeId: recipeId as Id<"recipes">,
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;
    const overId = over.id as string;
    const meal = active.data.current?.meal as PlannedMeal | undefined;

    let date: string;
    let mealType: string;
    if (overId.startsWith("tab:")) {
      date = overId.slice(4);
      mealType = meal?.mealType ?? "dinner";
    } else {
      [date, mealType] = overId.split(":");
    }

    if (meal && meal.date === date && meal.mealType === mealType.toLowerCase()) {
      return;
    }

    await moveMeal({
      id: active.id as Id<"mealPlans">,
      date,
      mealType: mealType.toLowerCase(),
    });
    if (overId.startsWith("tab:")) {
      toast.success(`Moved to ${date}`);
    }
  };

  const [showAutoGenerateConfirm, setShowAutoGenerateConfirm] = useState(false);

  const handleAutoGenerate = async () => {
    setShowAutoGenerateConfirm(true);
  };

  const confirmAutoGenerate = async () => {
    setShowAutoGenerateConfirm(false);
    setIsGenerating(true);

    try {
      // 1. Try AI Generation
      const result = await generateMealPlanWithAI();

      if (result && result.count > 0) {
        toast.success(result.message);
      } else {
        // 2. AI succeeded but returned 0 meals (hallucination/confusion) -> Fallback
        console.warn("AI returned 0 meals, falling back to random generation.");
        const fallbackResult = await autoGenerate({});
        if (fallbackResult) {
          toast.info(`AI returned empty. Fallback used: ${fallbackResult.message}`);
        }
      }
    } catch (error: any) {
      // 3. AI failed (timeout, rate limit, invalid JSON) -> Fallback
      console.error("AI Generation Failed:", error);
      try {
        const fallbackResult = await autoGenerate({});
        if (fallbackResult) {
          toast.info(`AI unavailable. Fallback used: ${fallbackResult.message}`);
        }
      } catch (fallbackError) {
        toast.error("Both AI and fallback generation failed.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToShoppingList = async () => {
    if (!mealPlans) return;

    const ingredientsToAdd: string[] = [];

    mealPlans.forEach((plan) => {
      const recipe = recipes?.find((r) => r._id === plan.recipeId);
      if (recipe) {
        ingredientsToAdd.push(...recipe.ingredients);
      }
    });

    if (ingredientsToAdd.length === 0) {
      toast.info("Plan some meals first to shop for them.");
      return;
    }

    const ids = await addBatchToShoppingList({ ingredients: ingredientsToAdd });
    toast.success(
      `Added ${ingredientsToAdd.length} ingredients to your shopping list`,
      {
        action: ids?.length
          ? {
              label: "Undo",
              onClick: () => removeBatchFromShoppingList({ ids }),
            }
          : undefined,
      }
    );
  };

  const handleClearAll = async () => {
    await clearAll();
    setShowClearConfirmDialog(false);
    toast.success("Meal plan cleared");
  };

  return (
    <div className="container mx-auto p-4">
      <title>CHEF | Meal Planner</title>
      <meta name="description" content="Plan your weekly meals with ease" />
      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold">Meal Planner</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 text-yellow-500 sm:mr-2" />
            )}
            <span className="hidden sm:inline">
              {isGenerating ? "Generating..." : "Magic Fill"}
            </span>
          </Button>
          <Button size="sm" onClick={handleAddToShoppingList}>
            <ShoppingCart className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Shop Week</span>
          </Button>
          {mealPlans && mealPlans.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setShowClearConfirmDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear meal plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {mealPlans === undefined ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {isDesktop ? (
            <div className="rounded-lg border">
              <div className="grid grid-cols-[8rem_repeat(3,1fr)] border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="px-3 py-2" />
                {MEAL_TYPES.map((type) => (
                  <div key={type} className="px-3 py-2">
                    {type}
                  </div>
                ))}
              </div>
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className="grid grid-cols-[8rem_repeat(3,1fr)] border-b last:border-b-0"
                >
                  <div
                    className={cn(
                      "px-3 py-3 text-sm font-semibold",
                      day === today && "text-primary"
                    )}
                  >
                    {day}
                    {day === today && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Today
                      </span>
                    )}
                  </div>
                  {MEAL_TYPES.map((type) => (
                    <div key={type} className="border-l p-1">
                      <MealSlot
                        day={day}
                        mealType={type}
                        meals={mealsFor(day, type)}
                        onAdd={() => openAdd(day, type)}
                        onRemove={handleRemove}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                {WEEK_DAYS.map((day) => (
                  <DayTab
                    key={day}
                    day={day}
                    isSelected={day === mobileDay}
                    isToday={day === today}
                    hasMeals={mealsFor(day).length > 0}
                    onSelect={() => setMobileDay(day)}
                  />
                ))}
              </div>
              <h2 className="text-lg font-semibold">
                {mobileDay}
                {mobileDay === today && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    Today
                  </span>
                )}
              </h2>
              <div className="space-y-3">
                {MEAL_TYPES.map((type) => (
                  <MealSlot
                    key={type}
                    day={mobileDay}
                    mealType={type}
                    meals={mealsFor(mobileDay, type)}
                    onAdd={() => openAdd(mobileDay, type)}
                    onRemove={handleRemove}
                    showLabel
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: drag a meal onto another day to move it.
              </p>
            </div>
          )}
        </DndContext>
      )}

      <MealSelector
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSelect={handleAddMeal}
        currentDate={selectedDate}
        currentMealType={selectedMealType}
      />

      <AlertDialog
        open={showClearConfirmDialog}
        onOpenChange={setShowClearConfirmDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Meal Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all meals from your weekly plan. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showAutoGenerateConfirm}
        onOpenChange={setShowAutoGenerateConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Generate Meal Plan</AlertDialogTitle>
            <AlertDialogDescription>
              This will use AI to intelligently fill empty slots with varied recipes from your collection and public recipes. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoGenerate} disabled={isGenerating}>
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
