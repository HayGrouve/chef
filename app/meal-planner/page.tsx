"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ShoppingCart,
  ArrowLeft,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
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
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

function DraggableMeal({
  meal,
  onRemove,
}: {
  meal: Doc<"mealPlans"> & {
    recipeTitle?: string;
    recipeImage?: string | null;
  };
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
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-background border rounded-md p-2 shadow-sm hover:shadow-md transition-all"
    >
      {/* Drag handle wraps the main content so the delete button is not draggable */}
      <div
        {...listeners}
        {...attributes}
        className="touch-none cursor-grab active:cursor-grabbing"
      >
        <div className="text-sm font-medium text-center line-clamp-2 mb-1">
          <Link
            href={`/recipe/${meal.recipeId}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {meal.recipeTitle}
          </Link>
        </div>
        {meal.recipeImage && (
          <div className="w-12 h-12 relative rounded-md overflow-hidden mb-1 mx-auto pointer-events-none">
            <Image
              src={meal.recipeImage}
              alt={meal.recipeTitle || ""}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(meal._id);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function DroppableDay({
  dateStr,
  mealType,
  children,
  onAdd,
}: {
  dateStr: string;
  mealType: string;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${dateStr}:${mealType}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 p-2 flex flex-col gap-2 min-h-[100px] transition-colors rounded-md ${
        isOver ? "bg-primary/10 border-primary border-2 border-dashed" : ""
      }`}
    >
      {children}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground hover:text-primary mt-auto h-8"
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

import { MealSelector } from "@/components/meal-planner/MealSelector";

export default function MealPlannerPage() {
  // CHANGED: No arguments needed for getWeek
  const mealPlans = useQuery(api.mealPlans.getWeek, {});

  const recipes = useQuery(api.recipes.listAll, {});
  const addMeal = useMutation(api.mealPlans.add);
  const removeMeal = useMutation(api.mealPlans.remove);
  const moveMeal = useMutation(api.mealPlans.move);
  const addBatchToShoppingList = useMutation(api.shoppingList.addBatch);
  const autoGenerate = useMutation(api.mealPlans.autoGenerate);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>("dinner");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showShopConfirmDialog, setShowShopConfirmDialog] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // NEW: Static week days
  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ].map((day) => ({
    dateStr: day, // We use the day name as the ID/key
    dayName: day,
    date: null, // No real date object needed
  }));

  const mealTypes = ["Breakfast", "Lunch", "Dinner"];

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

    if (over && active.id !== over.id) {
      const [date, mealType] = (over.id as string).split(":");
      await moveMeal({
        id: active.id as Id<"mealPlans">,
        date,
        mealType: mealType.toLowerCase(),
      });
    }
  };

  const [showAutoGenerateConfirm, setShowAutoGenerateConfirm] = useState(false);

  const handleAutoGenerate = async () => {
    setShowAutoGenerateConfirm(true);
  };

  const confirmAutoGenerate = async () => {
    // CHANGED: No startDate needed
    await autoGenerate({});
    setShowAutoGenerateConfirm(false);
    showAlert("Success", "Meal plan generated!");
  };

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
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

    if (ingredientsToAdd.length > 0) {
      await addBatchToShoppingList({ ingredients: ingredientsToAdd });
      setShowShopConfirmDialog(false);
      showAlert("Success", "Added ingredients to shopping list!");
    } else {
      setShowShopConfirmDialog(false);
      showAlert("Info", "No recipes found to add.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <title>CHEF | Meal Planner</title>
      <meta name="description" content="Plan your weekly meals with ease" />
      <div className="mb-4">
        <Link href="/">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Weekly Meal Planner</h1>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleAutoGenerate}>
            <Sparkles className="mr-2 h-4 w-4 text-yellow-500" /> Magic Fill
          </Button>
          <Button onClick={() => setShowShopConfirmDialog(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Shop This Week
          </Button>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day) => (
            <div key={day.dateStr} className="flex flex-col gap-2">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="font-bold">{day.dayName}</div>
              </div>

              <div className="space-y-2 flex-1">
                {mealTypes.map((type) => {
                  const typeLower = type.toLowerCase();
                  const plans =
                    mealPlans?.filter(
                      (p) => p.date === day.dateStr && p.mealType === typeLower
                    ) || [];

                  return (
                    <Card
                      key={type}
                      className="min-h-[120px] flex flex-col bg-muted/20"
                    >
                      <div className="p-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-background/50 text-center">
                        {type}
                      </div>
                      <DroppableDay
                        dateStr={day.dateStr}
                        mealType={type}
                        onAdd={() => {
                          setSelectedDate(day.dateStr);
                          setSelectedMealType(type);
                          setIsAddDialogOpen(true);
                        }}
                      >
                        {plans.map((plan) => (
                          <DraggableMeal
                            key={plan._id}
                            meal={plan}
                            onRemove={(id) => removeMeal({ id })}
                          />
                        ))}
                      </DroppableDay>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DndContext>

      <MealSelector
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSelect={handleAddMeal}
        currentDate={selectedDate}
        currentMealType={selectedMealType}
      />

      <AlertDialog
        open={showShopConfirmDialog}
        onOpenChange={setShowShopConfirmDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shop This Week</AlertDialogTitle>
            <AlertDialogDescription>
              Add ingredients for all planned meals this week to your shopping
              list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddToShoppingList}>
              Add Ingredients
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
              This will fill empty slots with random recipes from your
              favorites. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoGenerate}>
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alertTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4">{alertMessage}</div>
          <div className="flex justify-end">
            <Button onClick={() => setAlertOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
