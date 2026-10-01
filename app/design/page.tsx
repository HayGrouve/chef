import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DIRECTIONS } from "@/components/design/directions";

const STRUCTURE: Record<string, string[]> = {
  workspace: ["Library", "Collections (your tags)", "This week", "Shopping list", "Pantry"],
  cookbook: ["Cook (recipes + pantry search)", "Plan", "Shop"],
  spaces: ["Recipes", "Week (plan + shopping list)", "+ Add"],
};

export default function DesignIndex() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Three directions for CHEF</h1>
      <p className="mt-3 max-w-[60ch] text-muted-foreground">
        Each one reorganizes the app and gives it a new look. They all run on your real recipes,
        meal plan and shopping list, so favorites and &ldquo;add to list&rdquo; actually work.
      </p>

      <ol className="mt-10 divide-y border-y">
        {DIRECTIONS.map((d) => (
          <li key={d.id}>
            <Link
              href={`/design/${d.id}`}
              className="group grid gap-3 py-6 md:grid-cols-[10rem_1fr_auto] md:items-start md:gap-6"
            >
              <span className="text-xl font-semibold">{d.name}</span>
              <span>
                <span className="block text-muted-foreground">{d.summary}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {STRUCTURE[d.id].map((item) => (
                    <span key={item} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {item}
                    </span>
                  ))}
                </span>
              </span>
              <ArrowRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground md:block" />
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
