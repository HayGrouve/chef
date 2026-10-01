"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIRECTIONS, type DirectionId } from "./directions";

// Equivalent screens across directions, so switching keeps your place.
const EQUIVALENT: Record<string, Record<DirectionId, string>> = {
  week: { workspace: "/week", cookbook: "/plan", spaces: "/week" },
  list: { workspace: "/list", cookbook: "/shop", spaces: "/week" },
};
const SCREEN_OF: Record<string, keyof typeof EQUIVALENT> = {
  week: "week",
  plan: "week",
  list: "list",
  shop: "list",
};

function equivalentPath(pathname: string, target: DirectionId) {
  const rest = pathname.split("/").slice(3).join("/");
  if (rest.startsWith("recipe/")) return `/design/${target}/${rest}`;
  const screen = SCREEN_OF[rest];
  return `/design/${target}${screen ? EQUIVALENT[screen][target] : ""}`;
}

/**
 * Which direction you're in, and a way out: a bar above the page on phones, a
 * floating pill in the bottom-right corner on larger screens (so it never
 * fights with sticky headers or sidebars).
 */
export function PrototypeStrip() {
  const pathname = usePathname();
  const current = pathname.split("/")[2] as DirectionId | undefined;

  return (
    <div className="flex h-9 items-center gap-3 bg-zinc-900 px-3 text-xs text-zinc-300 md:fixed md:bottom-4 md:right-4 md:z-[60] md:rounded-full md:pl-4 md:shadow-lg md:ring-1 md:ring-white/10">
      <Link href="/design" className="font-medium text-zinc-100 hover:underline">
        Prototypes
      </Link>
      <nav className="flex items-center gap-1" aria-label="Design directions">
        {DIRECTIONS.map((d) => (
          <Link
            key={d.id}
            href={current ? equivalentPath(pathname, d.id) : `/design/${d.id}`}
            aria-current={current === d.id ? "page" : undefined}
            className={cn(
              "rounded-full px-2 py-1 transition-colors hover:text-zinc-50",
              current === d.id && "bg-zinc-700 text-zinc-50"
            )}
          >
            {d.name}
          </Link>
        ))}
      </nav>
      <Link href="/" className="ml-auto flex items-center gap-1 hover:text-zinc-50 md:ml-0">
        <X className="size-3.5" />
        Exit
      </Link>
    </div>
  );
}
