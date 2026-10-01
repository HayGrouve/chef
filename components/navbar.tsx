"use client";

// The app has three sections: Cook (recipes, plus "what can I make" in the
// search box), Plan and Shop. Phones get the same three in a bottom tab bar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link2, LogIn, PenLine, Plus, Search } from "lucide-react";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "../convex/_generated/api";
import { openCommandPalette } from "./command-palette/shared";

export const SECTIONS = [
  { href: "/", label: "Cook" },
  { href: "/meal-planner", label: "Plan" },
  { href: "/shopping-list", label: "Shop" },
] as const;

/** Cook stays highlighted on recipe pages, which you reach from it. */
export function isSectionActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/recipe/") : pathname === href;
}

export function Navbar() {
  const pathname = usePathname();
  const shoppingListCount = useQuery(api.shoppingList.getBadgeCount);

  if (pathname?.endsWith("/cook")) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
      {/* Three columns so the centered sections can never overlap either side. */}
      <div className="container mx-auto grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
        <Link href="/" className="w-fit font-display text-xl font-extrabold tracking-tight">
          chef<span className="text-primary">.</span>
        </Link>

        <Authenticated>
          <nav className="hidden items-center rounded-full bg-muted p-1 md:flex" aria-label="Sections">
            {SECTIONS.map(({ href, label }) => {
              const active = isSectionActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    active && "bg-background text-foreground shadow-sm"
                  )}
                >
                  {label}
                  {href === "/shopping-list" && !!shoppingListCount && (
                    <span className="ml-1.5 font-mono text-xs tabular-nums text-primary">
                      {shoppingListCount > 99 ? "99+" : shoppingListCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </Authenticated>

        {/* Every control here is h-9 (36px) so the row lines up. */}
        <div className="col-start-3 flex items-center justify-end gap-1.5">
          <Authenticated>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => openCommandPalette()}
              aria-label="Search and quick actions"
              title="Search and quick actions (Ctrl K)"
            >
              <Search />
            </Button>
            <AddRecipeMenu />
          </Authenticated>
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
          <Unauthenticated>
            <Button asChild>
              <Link href="/sign-in">
                <LogIn />
                Sign in
              </Link>
            </Button>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}

function AddRecipeMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="max-md:size-9 max-md:px-0" aria-label="Add a recipe">
          <Plus />
          <span className="hidden md:inline">Add recipe</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/create">
            <PenLine />
            Write it yourself
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/import">
            <Link2 />
            Import a link or photo
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
