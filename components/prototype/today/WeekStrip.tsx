"use client";

// PROTOTYPE — compact Mon–Sun strip of the meal plan for the "Today" hub.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MEAL_LABEL, WEEK_DAYS, dayIndex, sortMeals, weekDates, type Meal } from "./lib";
import { RecipeThumb, SectionTitle } from "./parts";

export function WeekStrip({ meals, now }: { meals: Meal[]; now: Date }) {
  const todayIdx = dayIndex(now);
  const dates = weekDates(now);
  const scroller = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  // On narrow screens, start the strip at today rather than Monday.
  useEffect(() => {
    const el = scroller.current;
    const day = todayRef.current;
    if (!el || !day || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = day.offsetLeft - el.offsetLeft - 16;
  }, []);

  return (
    <section>
      <SectionTitle title="This week" href="/meal-planner" linkLabel="Edit plan" />
      <Card className="py-0">
        <div
          ref={scroller}
          className="flex snap-x gap-2 overflow-x-auto p-2 md:grid md:grid-cols-7 md:overflow-visible"
        >
          {WEEK_DAYS.map((day, i) => {
            const dayMeals = sortMeals(meals.filter((m) => m.day === day));
            const isToday = i === todayIdx;
            const isPast = i < todayIdx;
            return (
              <div
                key={day}
                ref={isToday ? todayRef : undefined}
                className={cn(
                  "flex w-36 shrink-0 snap-start flex-col gap-1.5 rounded-lg p-2 md:w-auto",
                  isToday && "bg-primary/5 ring-2 ring-primary/50",
                  isPast && "opacity-55"
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {isToday ? "Today" : day.slice(0, 3)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dates[i].getDate()}
                  </span>
                </div>
                {dayMeals.length === 0 ? (
                  <Link
                    href="/meal-planner"
                    className="flex min-h-12 items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {isPast ? "—" : (
                      <>
                        <Plus className="h-3 w-3" /> Plan
                      </>
                    )}
                  </Link>
                ) : (
                  dayMeals.map((m) => (
                    <Link
                      key={m._id}
                      href={`/recipe/${m.recipe._id}`}
                      className="group flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted"
                    >
                      <RecipeThumb
                        title={m.recipe.title}
                        imageUrl={m.recipe.imageUrl}
                        className="h-8 w-8 text-xs"
                        sizes="32px"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {MEAL_LABEL[m.mealType] ?? m.mealType}
                        </p>
                        <p className="line-clamp-2 text-xs font-medium leading-tight group-hover:underline">
                          {m.recipe.title}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
