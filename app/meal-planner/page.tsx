"use client";

import { useState, useSyncExternalStore } from "react";
import { once, useSingleFlight } from "@/hooks/use-single-flight";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Sparkles,
  MoreHorizontal,
  Loader2,
  CalendarArrowUp,
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
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn, pluralize } from "@/lib/utils";

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
  onMove,
}: {
  meal: PlannedMeal;
  onRemove: (meal: PlannedMeal) => void;
  onMove: (meal: PlannedMeal, day: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: meal._id,
      data: { meal },
    });
  // Undefined when the recipe was made private by its author
  const unavailable = meal.recipeTitle === undefined;
  const title = meal.recipeTitle ?? "unavailable recipe";

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
      {/* Pointer drags start anywhere on the card; keyboard drags only from the
          thumbnail button (the activator), so Enter on the link still navigates. */}
      <div
        {...listeners}
        className="flex min-w-0 flex-1 items-center gap-2 touch-none cursor-grab active:cursor-grabbing"
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          aria-label={`Move ${title}`}
          className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-muted"
        >
          {meal.recipeImage && (
            <Image
              src={meal.recipeImage}
              alt=""
              fill
              sizes="36px"
              className="pointer-events-none object-cover"
            />
          )}
        </button>
        {unavailable ? (
          <span className="text-sm italic leading-tight text-muted-foreground line-clamp-2">
            Recipe no longer available
          </span>
        ) : (
          <Link
            href={`/recipe/${meal.recipeId}`}
            className="text-sm font-medium leading-tight line-clamp-2 hover:underline"
          >
            {meal.recipeTitle}
          </Link>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Options for ${title}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* The non-drag way to move a meal; it keeps its meal type, like dropping on a day tab. */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CalendarArrowUp className="h-4 w-4" />
              Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {WEEK_DAYS.filter((d) => d !== meal.date).map((d) => (
                <DropdownMenuItem key={d} onSelect={() => onMove(meal, d)}>
                  {d}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onRemove(meal)}>
            <Trash2 className="h-4 w-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MealSlot({
  day,
  mealType,
  meals,
  onAdd,
  onRemove,
  onMove,
  showLabel,
}: {
  day: string;
  mealType: string;
  meals: PlannedMeal[];
  onAdd: () => void;
  onRemove: (meal: PlannedMeal) => void;
  onMove: (meal: PlannedMeal, day: string) => void;
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
        <DraggableMeal key={meal._id} meal={meal} onRemove={onRemove} onMove={onMove} />
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
      aria-label={[day, isToday && "today", hasMeals && "has meals"].filter(Boolean).join(", ")}
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

// Drop where the pointer is, not where most of the (wide) card overlaps.
// Keyboard drags have no pointer, so fall back to overlap.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

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

  // The meal may already be gone (removed in another tab) or its recipe made private
  const failed = (what: string) => () =>
    toast.error(`Couldn’t ${what}. Refresh and try again.`);

  const handleRemove = async (meal: PlannedMeal) => {
    try {
      await removeMeal({ id: meal._id });
    } catch {
      return failed("remove that meal")();
    }
    toast.success(`Removed ${meal.recipeTitle ?? "meal"}`, {
      action: {
        label: "Undo",
        onClick: once(() =>
          addMeal({ date: meal.date, mealType: meal.mealType, recipeId: meal.recipeId }).catch(
            () => toast.error("That recipe is no longer available.")
          )
        ),
      },
    });
  };

  const handleMove = async (meal: PlannedMeal, day: string) => {
    try {
      await moveMeal({ id: meal._id, date: day, mealType: meal.mealType });
      toast.success(`Moved to ${day}`);
    } catch {
      failed("move that meal")();
    }
  };

  const [handleAddMeal] = useSingleFlight(async (recipeId: string) => {
    if (selectedDate && selectedMealType) {
      try {
        await addMeal({
          date: selectedDate,
          mealType: selectedMealType.toLowerCase(),
          recipeId: recipeId as Id<"recipes">,
        });
        setIsAddDialogOpen(false);
      } catch {
        failed("add that meal")();
      }
    }
  });

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

    try {
      await moveMeal({
        id: active.id as Id<"mealPlans">,
        date,
        mealType: mealType.toLowerCase(),
      });
    } catch {
      return failed("move that meal")();
    }
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
        if (fallbackResult?.count === 0) {
          // Nothing to fill (e.g. the week is already planned): say why
          toast.info(result?.message ?? fallbackResult.message);
        } else if (fallbackResult) {
          toast.info(fallbackResult.message, {
            description: "AI couldn’t suggest anything, so recipes were picked at random.",
          });
        }
      }
    } catch (error: any) {
      // 3. AI failed (timeout, rate limit, invalid JSON) -> Fallback
      console.error("AI Generation Failed:", error);
      try {
        const fallbackResult = await autoGenerate({});
        if (fallbackResult?.count === 0) {
          // Nothing to fill (e.g. the week is already planned): say why
          toast.info(fallbackResult.message);
        } else if (fallbackResult) {
          toast.info(fallbackResult.message, {
            description: "AI planning isn’t available right now, so recipes were picked at random.",
          });
        }
      } catch {
        toast.error("Couldn’t fill the week", {
          description: "Try again in a minute, or add meals one at a time.",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const [handleAddToShoppingList, isShopping] = useSingleFlight(async () => {
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
      `Added ${pluralize(ingredientsToAdd.length, "ingredient")} to your shopping list`,
      {
        action: ids?.length
          ? {
              label: "Undo",
              onClick: () => removeBatchFromShoppingList({ ids }),
            }
          : undefined,
      }
    );
  });

  const handleClearAll = async () => {
    await clearAll();
    setShowClearConfirmDialog(false);
    toast.success("Meal plan cleared");
  };

  return (
    <div className="container mx-auto px-4 pb-16 pt-6 md:pt-10">
      <title>CHEF | Meal Planner</title>
      <meta name="description" content="Plan your weekly meals with ease" />
      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Meal planner</h1>

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
              <Sparkles className="h-4 w-4 text-primary sm:mr-2" />
            )}
            {/* Icon-only on phones, but the text stays in the accessible name. */}
            <span className="sr-only sm:not-sr-only">
              {isGenerating ? "Generating…" : "Magic fill"}
            </span>
          </Button>
          <Button size="sm" onClick={() => void handleAddToShoppingList()} disabled={isShopping}>
            <ShoppingCart className="h-4 w-4 sm:mr-2" />
            <span className="sr-only sm:not-sr-only">Shop week</span>
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
        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
          {isDesktop ? (
            <div className="rounded-lg border">
              <table className="w-full table-fixed border-collapse">
                <caption className="sr-only">Meals planned this week</caption>
                <thead className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-32 px-3 py-2">
                      <span className="sr-only">Day</span>
                    </th>
                    {MEAL_TYPES.map((type) => (
                      <th key={type} scope="col" className="px-3 py-2 font-semibold">
                        {type}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEK_DAYS.map((day) => (
                    <tr key={day} className="border-b last:border-b-0">
                      <th
                        scope="row"
                        className={cn(
                          "px-3 py-3 text-left align-top text-sm font-semibold",
                          day === today && "text-primary"
                        )}
                      >
                        {day}
                        {day === today && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            Today
                          </span>
                        )}
                      </th>
                      {MEAL_TYPES.map((type) => (
                        <td key={type} className="border-l p-1 align-top">
                          <MealSlot
                            day={day}
                            mealType={type}
                            meals={mealsFor(day, type)}
                            onAdd={() => openAdd(day, type)}
                            onRemove={handleRemove}
                            onMove={handleMove}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    onMove={handleMove}
                    showLabel
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: drag a meal onto another day, or use its ⋯ menu, to move it.
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
            <AlertDialogTitle>Clear the meal plan?</AlertDialogTitle>
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
            <AlertDialogTitle>Fill the week automatically?</AlertDialogTitle>
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
