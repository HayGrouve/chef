"use client";

// The app has three sections: Готви (recipes, plus "what can I make" in the
// search box), Планирай and Пазарувай. Phones get the same three in a bottom tab bar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link2, LogIn, LogOut, PenLine, Plus, Search, UserRound } from "lucide-react";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { useClerk, useUser } from "@clerk/nextjs";
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
import { openCommandPalette, useModKey } from "./command-palette/shared";

export const SECTIONS = [
  { href: "/", label: "Готви" },
  { href: "/meal-planner", label: "Планирай" },
  { href: "/shopping-list", label: "Пазарувай" },
] as const;

/** Готви stays highlighted on recipe pages, which you reach from it. */
export function isSectionActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/recipe/") : pathname === href;
}

export function Navbar() {
  const pathname = usePathname();
  const shoppingListCount = useQuery(api.shoppingList.getBadgeCount);
  const modKey = useModKey() ?? "Ctrl";

  if (pathname?.endsWith("/cook")) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
      {/* Three columns so the centered sections can never overlap either side. */}
      <div className="container mx-auto grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
        <Link
          href="/"
          aria-label="Онова за кухнята, начало"
          className="w-fit whitespace-nowrap font-display text-xl font-extrabold tracking-tight"
        >
          <span className="font-medium text-muted-foreground max-sm:hidden">онова за </span>
          кухнята<span className="text-primary">.</span>
        </Link>

        <Authenticated>
          <nav className="hidden items-center rounded-full bg-muted p-1 md:flex" aria-label="Раздели">
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
              aria-label="Търсене и бързи действия"
              title={`Търсене и бързи действия (${modKey}\u00A0K)`}
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
            <AccountMenu />
          </Authenticated>
          <Unauthenticated>
            <Button asChild>
              {/* Come back to this page afterwards */}
              <Link
                href={
                  pathname && pathname !== "/"
                    ? `/sign-in?redirect_url=${encodeURIComponent(pathname)}`
                    : "/sign-in"
                }
              >
                <LogIn />
                Вход
              </Link>
            </Button>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}

/** The account lives in the онова за Акаунт; here only the way there and Изход. */
function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="overflow-hidden rounded-full" aria-label="Твоят акаунт">
          {user?.imageUrl ? (
            // Decorative: the button carries the label
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="" className="size-9 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserRound />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a href="https://onovaza.com/akaunt">
            <UserRound />
            Акаунт
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut({ redirectUrl: "/" })}>
          <LogOut />
          Изход
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddRecipeMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="max-md:size-9 max-md:px-0" aria-label="Добави рецепта">
          <Plus />
          <span className="hidden md:inline">Добави рецепта</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/create">
            <PenLine />
            Напиши я сам
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/import">
            <Link2 />
            От линк или снимка
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
