"use client";

import { Fragment, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DAYS, MEALS, todayName } from "../shared";

const MEAL_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;

/** Day × meal grid for putting a recipe on the week. Taken slots show as filled. */
export function PlanPicker({
  recipeId,
  recipeTitle,
  children,
}: {
  recipeId: string;
  recipeTitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const week = useQuery(api.mealPlans.getWeek, open ? {} : "skip");
  const add = useMutation(api.mealPlans.add);
  const remove = useMutation(api.mealPlans.remove);
  const today = todayName();

  const taken = (day: string, meal: string) =>
    week?.find((m) => m.date === day && m.mealType.toLowerCase() === meal);

  const plan = async (day: string, meal: (typeof MEALS)[number]) => {
    const id = await add({ date: day, mealType: MEAL_LABEL[meal], recipeId: recipeId as Id<"recipes"> });
    setOpen(false);
    toast.success(`${recipeTitle} is on ${day} ${meal}`, {
      action: { label: "Undo", onClick: () => remove({ id }) },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-2xl p-3">
        <p className="px-1 pb-2 text-sm font-medium">Add to the week</p>
        <div className="grid grid-cols-[auto_repeat(3,2.75rem)] items-center gap-1 text-xs">
          <span />
          {MEALS.map((m) => (
            <span key={m} className="text-center text-muted-foreground">
              {MEAL_LABEL[m].slice(0, 1)}
            </span>
          ))}
          {DAYS.map((day) => (
            <Fragment key={day}>
              <span className={cn("pr-3 text-sm", day === today && "font-semibold text-primary")}>
                {day.slice(0, 3)}
              </span>
              {MEALS.map((meal) => {
                const existing = taken(day, meal);
                return (
                  <button
                    key={meal}
                    onClick={() => plan(day, meal)}
                    title={existing?.recipeTitle ? `${MEAL_LABEL[meal]}: ${existing.recipeTitle}` : `${day} ${meal}`}
                    aria-label={`${day} ${meal}${existing ? `, has ${existing.recipeTitle ?? "a meal"}` : ""}`}
                    className={cn(
                      "h-8 rounded-lg border transition-colors hover:border-primary hover:bg-primary/10",
                      existing && "border-transparent bg-muted"
                    )}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
        <p className="px-1 pt-2 text-xs text-muted-foreground">Filled slots already have a meal; you can add another.</p>
      </PopoverContent>
    </Popover>
  );
}

