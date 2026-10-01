"use client";

// Workspace: one sidebar holds the whole app. The home filters turn into
// collections (Library + your tags), and the kitchen tools sit underneath.
// Phones get the same sidebar in a sheet plus a four-item tab bar.

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  Clock,
  Hash,
  Heart,
  Link2,
  Menu,
  PenLine,
  Plus,
  Refrigerator,
  Search,
  ShoppingBasket,
  User,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, openCommandPalette, useModKey } from "@/components/command-palette/shared";
import { cn } from "@/lib/utils";
import { COLLECTIONS, inCollection, useLibrary, type Collection } from "../shared";

const BASE = "/design/workspace";

const COLLECTION_ICONS: Record<Collection, typeof BookOpen> = {
  all: BookOpen,
  mine: User,
  favorites: Heart,
  quick: Clock,
};

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-sidebar-border bg-sidebar md:block">
        <Sidebar />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 pb-20 md:pb-0">
        <MobileTopBar onMenu={() => setMenuOpen(true)} />
        {children}
      </div>

      <MobileTabs />
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { recipes, tags } = useLibrary();
  const listCount = useQuery(api.shoppingList.getBadgeCount);
  const modKey = useModKey();
  const [showAllTags, setShowAllTags] = useState(false);

  const onLibrary = pathname === BASE;
  const activeCollection = onLibrary && !params.get("tag") ? (params.get("c") ?? "all") : null;
  const activeTag = onLibrary ? params.get("tag") : null;
  const visibleTags = showAllTags ? tags : tags.slice(0, 7);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <ChefHat className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">CHEF</span>
      </div>

      <div className="flex flex-col gap-2 px-3">
        <Authenticated>
          <button
            onClick={() => openCommandPalette()}
            className="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="size-3.5" />
            <span className="flex-1 text-left">Search</span>
            {modKey && (
              <span className="flex gap-0.5">
                <Kbd>{modKey}</Kbd>
                <Kbd>K</Kbd>
              </span>
            )}
          </button>
          <NewRecipeMenu />
        </Authenticated>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4 text-sm" onClick={onNavigate}>
        <SidebarGroup label="Library">
          {COLLECTIONS.map(({ id, label }) => (
            <SidebarLink
              key={id}
              href={id === "all" ? BASE : `${BASE}?c=${id}`}
              icon={COLLECTION_ICONS[id]}
              active={activeCollection === id}
              count={recipes.filter((r) => inCollection(r, id)).length}
            >
              {label}
            </SidebarLink>
          ))}
        </SidebarGroup>

        {tags.length > 0 && (
          <SidebarGroup label="Collections">
            {visibleTags.map((tag) => (
              <SidebarLink
                key={tag.name}
                href={`${BASE}?tag=${encodeURIComponent(tag.name)}`}
                icon={Hash}
                active={activeTag === tag.name}
                count={tag.count}
              >
                {tag.name}
              </SidebarLink>
            ))}
            {tags.length > 7 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTags((v) => !v);
                }}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showAllTags ? "Show fewer" : `Show all ${tags.length}`}
              </button>
            )}
          </SidebarGroup>
        )}

        <Authenticated>
          <SidebarGroup label="Kitchen">
            <SidebarLink href={`${BASE}/week`} icon={CalendarDays} active={pathname === `${BASE}/week`}>
              This week
            </SidebarLink>
            <SidebarLink
              href={`${BASE}/list`}
              icon={ShoppingBasket}
              active={pathname === `${BASE}/list`}
              count={listCount || undefined}
              countEmphasis
            >
              Shopping list
            </SidebarLink>
            <SidebarLink href={`${BASE}/pantry`} icon={Refrigerator} active={pathname === `${BASE}/pantry`}>
              Pantry
            </SidebarLink>
          </SidebarGroup>
        </Authenticated>
      </nav>

      <div className="flex items-center gap-2 border-t border-sidebar-border p-3">
        <AuthLoading>
          <Skeleton className="size-8 rounded-full" />
        </AuthLoading>
        <Authenticated>
          <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
        </Authenticated>
        <Unauthenticated>
          <Button asChild size="sm" className="flex-1">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </Unauthenticated>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </div>
    </div>
  );
}

function NewRecipeMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={cn("w-full", className)}>
          <Plus />
          New recipe
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
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

function SidebarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  count,
  countEmphasis,
  children,
}: {
  href: string;
  icon: typeof BookOpen;
  active?: boolean;
  count?: number;
  countEmphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent font-medium text-foreground"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-primary")} strokeWidth={1.75} />
      <span className="flex-1 truncate">{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            countEmphasis ? "rounded bg-primary px-1.5 text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/90 px-2 backdrop-blur md:hidden">
      <Button variant="ghost" size="icon" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>
      <span className="flex-1 font-semibold tracking-tight">CHEF</span>
      <Authenticated>
        <Button variant="ghost" size="icon" onClick={() => openCommandPalette()} aria-label="Search">
          <Search />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" aria-label="New recipe">
              <Plus />
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
    </div>
  );
}

function MobileTabs() {
  const pathname = usePathname();
  const listCount = useQuery(api.shoppingList.getBadgeCount);
  const tabs = [
    { href: BASE, label: "Library", icon: BookOpen },
    { href: `${BASE}/week`, label: "Week", icon: CalendarDays },
    { href: `${BASE}/list`, label: "List", icon: ShoppingBasket, badge: listCount },
    { href: `${BASE}/pantry`, label: "Pantry", icon: Refrigerator },
  ];
  return (
    <Authenticated>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t bg-background md:hidden">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = href === BASE ? pathname === BASE || pathname.startsWith(`${BASE}/recipe`) : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={1.75} />
                {!!badge && (
                  <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </Authenticated>
  );
}
