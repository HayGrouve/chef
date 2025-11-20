"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar as CalendarIcon, ShoppingCart, ArrowLeft, CalendarDays } from "lucide-react";
import { format, startOfWeek, addDays, endOfWeek } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { Id } from "../../convex/_generated/dataModel";
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

export default function MealPlannerPage() {
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const mealPlans = useQuery(api.mealPlans.getWeek, { 
    startDate: weekStartStr, 
    endDate: weekEndStr 
  });

  const recipes = useQuery(api.recipes.list, {});
  const addMeal = useMutation(api.mealPlans.add);
  const removeMeal = useMutation(api.mealPlans.remove);
  const addBatchToShoppingList = useMutation(api.shoppingList.addBatch);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>("dinner");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showShopConfirmDialog, setShowShopConfirmDialog] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(currentWeekStart, i);
    return {
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      dayName: format(date, "EEEE"),
    };
  });

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

  const showAlert = (title: string, message: string) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertOpen(true);
  };

  const handleAddToShoppingList = async () => {
    if (!mealPlans) return;
    
    const ingredientsToAdd: string[] = [];
      
    mealPlans.forEach(plan => {
      const recipe = recipes?.find(r => r._id === plan.recipeId);
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
           <Button variant="outline" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
             Previous Week
           </Button>
           <span className="flex items-center font-medium">
             {format(currentWeekStart, "MMM d")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM d")}
           </span>
           <Button variant="outline" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
             Next Week
           </Button>
        </div>
        <Button onClick={() => setShowShopConfirmDialog(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Shop This Week
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => (
          <div key={day.dateStr} className="flex flex-col gap-2">
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="font-bold">{day.dayName}</div>
              <div className="text-sm text-muted-foreground">{format(day.date, "MMM d")}</div>
            </div>
            
            <div className="space-y-2 flex-1">
              {mealTypes.map((type) => {
                 const typeLower = type.toLowerCase();
                 const plan = mealPlans?.find(p => p.date === day.dateStr && p.mealType === typeLower);
                 
                 return (
                   <Card key={type} className="min-h-[100px] flex flex-col">
                     <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/20">
                       {type}
                     </div>
                     <div className="flex-1 p-2 flex flex-col justify-center items-center relative group">
                       {plan ? (
                         <>
                           <div className="text-sm font-medium text-center line-clamp-2 mb-1">
                             <Link href={`/recipe/${plan.recipeId}`} className="hover:underline">
                               {plan.recipeTitle}
                             </Link>
                           </div>
                           {plan.recipeImage && (
                             <div className="w-12 h-12 relative rounded-md overflow-hidden mb-1">
                                <Image src={plan.recipeImage} alt={plan.recipeTitle || ""} fill className="object-cover" />
                             </div>
                           )}
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                             onClick={() => removeMeal({ id: plan._id })}
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         </>
                       ) : (
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-full w-full text-muted-foreground hover:text-primary"
                           onClick={() => {
                             setSelectedDate(day.dateStr);
                             setSelectedMealType(type);
                             setIsAddDialogOpen(true);
                           }}
                         >
                           <Plus className="h-4 w-4" />
                         </Button>
                       )}
                     </div>
                   </Card>
                 );
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meal for {selectedMealType} on {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
               {recipes?.map(recipe => (
                 <div 
                    key={recipe._id} 
                    className="border rounded-lg p-2 cursor-pointer hover:bg-accent flex items-center gap-2"
                    onClick={() => handleAddMeal(recipe._id)}
                 >
                    {recipe.imageUrl && (
                        <div className="w-10 h-10 relative rounded overflow-hidden flex-shrink-0">
                             <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover" />
                        </div>
                    )}
                    <span className="text-sm font-medium line-clamp-2">{recipe.title}</span>
                 </div>
               ))}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showShopConfirmDialog} onOpenChange={setShowShopConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shop This Week</AlertDialogTitle>
            <AlertDialogDescription>
              Add ingredients for all planned meals this week to your shopping list?
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

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alertTitle}</DialogTitle>
            <DialogDescription>
              {alertMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAlertOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
