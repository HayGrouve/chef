"use client";

// Spaces: two places instead of five. Recipes (browse, plus "what can I make")
// and Week (the meal plan and the shopping list on one screen). A floating
// dock holds both, the add button and search, on every screen size.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { BookOpen, CalendarDays, Link2, PenLine, Plus, Search } from "lucide-react";
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
import { openCommandPalette } from "@/components/command-palette/shared";
import { cn } from "@/lib/utils";

const BASE = "/design/spaces";

export function SpacesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-28">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 md:px-6">
        <Link href={BASE} className="text-lg font-semibold tracking-tight">
          CHEF
        </Link>
        <div className="ml-auto flex items-center gap-1">
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
      </header>
      {children}
      <Authenticated>
        <Dock />
      </Authenticated>
    </div>
  );
}

function Dock() {
  const pathname = usePathname();
  const listCount = useQuery(api.shoppingList.getBadgeCount);
  const onWeek = pathname === `${BASE}/week`;

  return (
    <nav
      aria-label="Spaces"
      className="spaces-dock fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border p-1.5"
    >
      <DockLink href={BASE} active={!onWeek} icon={BookOpen} label="Recipes" />
      <DockLink
        href={`${BASE}/week`}
        active={onWeek}
        icon={CalendarDays}
        label="Week"
        badge={listCount || undefined}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Add a recipe"
            className="mx-1 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={12} className="w-56 rounded-2xl p-1.5">
          <DropdownMenuItem asChild className="rounded-xl">
            <Link href="/create">
              <PenLine />
              Write it yourself
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-xl">
            <Link href="/import">
              <Link2 />
              Import a link or photo
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        onClick={() => openCommandPalette()}
        aria-label="Search"
        className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Search className="size-5" />
      </button>
    </nav>
  );
}

function DockLink({
  href,
  active,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  icon: typeof BookOpen;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        active && "bg-foreground text-background hover:text-background"
      )}
    >
      <Icon className="size-[18px]" />
      {label}
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 font-mono text-[11px] tabular-nums leading-5",
            active ? "bg-background/20" : "bg-primary text-primary-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
