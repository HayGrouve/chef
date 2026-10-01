"use client";

// Cookbook: the app becomes three sections, Cook, Plan and Shop. Pantry is no
// longer its own page; the Cook search box handles "what can I make with…".

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { CalendarDays, CookingPot, Link2, PenLine, Plus, ShoppingBasket } from "lucide-react";
import { api } from "@/convex/_generated/api";
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

const BASE = "/design/cookbook";

const SECTIONS = [
  { href: BASE, label: "Cook", icon: CookingPot },
  { href: `${BASE}/plan`, label: "Plan", icon: CalendarDays },
  { href: `${BASE}/shop`, label: "Shop", icon: ShoppingBasket },
];

function useActiveSection() {
  const pathname = usePathname();
  return (href: string) =>
    href === BASE ? pathname === BASE || pathname.startsWith(`${BASE}/recipe`) : pathname === href;
}

export function CookbookShell({ children }: { children: React.ReactNode }) {
  const isActive = useActiveSection();
  const listCount = useQuery(api.shoppingList.getBadgeCount);

  return (
    <div className="pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-8">
          <Link href={BASE} className="font-display text-xl font-extrabold tracking-tight">
            chef<span className="text-primary">.</span>
          </Link>

          <Authenticated>
            <nav className="hidden items-center rounded-full bg-muted p-1 md:flex" aria-label="Sections">
              {SECTIONS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    isActive(href) && "bg-background text-foreground shadow-sm"
                  )}
                >
                  {label}
                  {label === "Shop" && !!listCount && (
                    <span className="ml-1.5 font-mono text-xs tabular-nums text-primary">{listCount}</span>
                  )}
                </Link>
              ))}
            </nav>
          </Authenticated>

          <div className="col-start-3 flex items-center justify-end gap-1.5">
            <Authenticated>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-full max-md:size-9 max-md:px-0" aria-label="Add a recipe">
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
            </Authenticated>
            <ModeToggle />
            <AuthLoading>
              <Skeleton className="size-9 rounded-full" />
            </AuthLoading>
            <Authenticated>
              <UserButton appearance={{ elements: { avatarBox: "size-9" } }} />
            </Authenticated>
            <Unauthenticated>
              <Button asChild className="rounded-full">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </Unauthenticated>
          </div>
        </div>
      </header>

      {children}

      <Authenticated>
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t bg-background md:hidden"
          aria-label="Sections"
        >
          {SECTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                isActive(href) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={1.75} />
                {label === "Shop" && !!listCount && (
                  <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground">
                    {listCount > 99 ? "99+" : listCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          ))}
        </nav>
      </Authenticated>
    </div>
  );
}
