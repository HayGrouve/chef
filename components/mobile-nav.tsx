"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Refrigerator, PlusSquare, ShoppingCart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function MobileNav() {
  const pathname = usePathname();
  const shoppingListCount = useQuery(api.shoppingList.getBadgeCount);

  // Hide nav on recipe cook page
  // PROTOTYPE: /prototype/cook/[id] is full screen too
  if (/^\/recipe\/[^/]+\/cook$/.test(pathname) || pathname.startsWith("/prototype/cook/")) {
    return null;
  }

  const links = [
    { href: "/", icon: ChefHat, label: "Recipes" },
    { href: "/meal-planner", icon: Calendar, label: "Planner" },
    { href: "/create", icon: PlusSquare, label: "Add" },
    {
      href: "/shopping-list",
      icon: ShoppingCart,
      label: "Shopping",
      badge: shoppingListCount,
    },
    { href: "/pantry", icon: Refrigerator, label: "Pantry" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, icon: Icon, label, badge }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
