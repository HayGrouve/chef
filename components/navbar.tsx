"use client";

import {
  ChefHat,
  ShoppingCart,
  Calendar,
  Refrigerator,
  Plus,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "../convex/_generated/api";
import {
  CommandPaletteIconTrigger,
  CommandPaletteTrigger,
} from "./command-palette/CommandPaletteTrigger";

export function Navbar() {
  const pathname = usePathname();
  const shoppingListCount = useQuery(api.shoppingList.getBadgeCount);

  // Cook mode and the /design prototypes bring their own chrome.
  if (pathname?.endsWith("/cook") || pathname?.startsWith("/design")) return null;

  const navItems = [
    { href: "/", label: "Recipes", icon: ChefHat },
    { href: "/meal-planner", label: "Meal Planner", icon: Calendar },
    {
      href: "/shopping-list",
      label: "Shopping List",
      icon: ShoppingCart,
      badge: shoppingListCount,
    },
    { href: "/pantry", label: "Pantry", icon: Refrigerator },
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      {/* Three columns so the centered nav can never overlap either side. */}
      <div className="container mx-auto px-4 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left: Brand + search */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold hidden md:inline-block">CHEF</span>
          </Link>
          <Authenticated>
            <CommandPaletteTrigger />
          </Authenticated>
        </div>

        {/* Center: Navigation */}
        <Authenticated>
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {navItems.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors hover:text-primary relative",
                  pathname === href
                    ? "text-foreground font-bold"
                    : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                {label}
              </Link>
            ))}
          </nav>
        </Authenticated>

        {/* Right: Actions */}
        {/* Every control here is h-9 (36px) so the row lines up. */}
        <div className="col-start-3 flex items-center justify-end gap-2">
          <Authenticated>
            <CommandPaletteIconTrigger />
            <Button asChild className="hidden md:flex max-lg:size-9 max-lg:px-0">
              <Link href="/create" aria-label="Add Recipe">
                <Plus />
                <span className="hidden lg:inline">Add Recipe</span>
              </Link>
            </Button>
          </Authenticated>

          <div className="flex items-center gap-1">
            <ModeToggle />
            <AuthLoading>
              <Skeleton className="size-9 rounded-full" />
            </AuthLoading>
            <Authenticated>
              <UserButton
                appearance={{
                  elements: {
                    userButtonTrigger: "rounded-full",
                    avatarBox: "size-9",
                  },
                }}
              />
            </Authenticated>
          </div>

          <Unauthenticated>
            <Button asChild>
              <Link href="/sign-in">
                <LogIn />
                Sign In
              </Link>
            </Button>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}

