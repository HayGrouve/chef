"use client";

// PROTOTYPE — getting-started checklist for a brand-new user on the "Today" hub.
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function GettingStarted({
  hasRecipes,
  hasMeals,
  hasStaples,
}: {
  hasRecipes: boolean;
  hasMeals: boolean;
  hasStaples: boolean;
}) {
  const steps = [
    {
      done: hasRecipes,
      title: "Import your first recipe",
      body: "Paste a link or snap a cookbook page.",
      href: "/prototype/import",
    },
    {
      done: hasMeals,
      title: "Plan a meal",
      body: "Put something on this week's plan.",
      href: "/meal-planner",
    },
    {
      done: hasStaples,
      title: "Add your staples",
      body: "Tell us what's always in your kitchen.",
      href: "#staples",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="gap-4 p-5 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Getting started · {doneCount} of {steps.length}
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight">Set up your kitchen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Three quick steps and this page will tell you what to cook and what to buy.
        </p>
      </div>
      <ol className="divide-y rounded-lg border">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Link
              href={s.href}
              className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/60"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  s.done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {s.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-medium", s.done && "text-muted-foreground line-through")}>
                  {s.title}
                </span>
                <span className="block text-sm text-muted-foreground">{s.body}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
