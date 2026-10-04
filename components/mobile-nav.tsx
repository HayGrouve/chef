"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CookingPot, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SECTIONS, isSectionActive } from "./navbar";

const ICONS = {
  "/": CookingPot,
  "/meal-planner": CalendarDays,
  "/shopping-list": ShoppingBasket,
};

/** Phone tab bar with the same three sections as the header. "Add" is the + in the header. */
export function MobileNav() {
  const pathname = usePathname();
  const shoppingListCount = useQuery(api.shoppingList.getBadgeCount);

  // Hide nav on recipe cook page
  if (/^\/recipe\/[^/]+\/cook$/.test(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="Sections"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid h-16 grid-cols-3">
        {SECTIONS.map(({ href, label }) => {
          const Icon = ICONS[href];
          const active = isSectionActive(href, pathname);
          const badge = href === "/shopping-list" ? shoppingListCount : undefined;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={1.75} />
                {!!badge && (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              {label}
              {!!badge && <span className="sr-only">, {badge} to buy</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
