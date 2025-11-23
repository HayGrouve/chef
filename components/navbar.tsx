"use client";

import {
  ChefHat,
  ShoppingCart,
  Calendar,
  Search,
  Plus,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  if (pathname?.endsWith("/cook")) return null;

  const navItems = [
    { href: "/", label: "Recipes", icon: ChefHat },
    { href: "/meal-planner", label: "Meal Planner", icon: Calendar },
    { href: "/shopping-list", label: "Shopping List", icon: ShoppingCart },
    { href: "/pantry", label: "Pantry", icon: Search },
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <ChefHat className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold hidden md:inline-block">CHEF</span>
        </Link>

        {/* Center: Navigation */}
        <Authenticated>
          <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  pathname === href
                    ? "text-foreground font-bold"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </Authenticated>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <AuthLoading>
            <Button variant="ghost" size="sm" disabled>
              Loading...
            </Button>
          </AuthLoading>
          
          <Authenticated>
            <Link href="/create">
              <Button size="sm" className="hidden md:flex">
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            </Link>
            <div className="ml-2 flex">
              <UserButton />
            </div>
          </Authenticated>

          <Unauthenticated>
            <Link href="/sign-in">
              <Button size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}

