"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, ShoppingCart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  // Hide nav on recipe cook page
  if (/^\/recipe\/[^/]+\/cook$/.test(pathname)) {
    return null;
  }

  const links = [
    {
      href: "/",
      icon: Home,
      label: "Home",
    },
    {
      href: "/shopping-list",
      icon: ShoppingCart,
      label: "Shop",
    },
    {
      href: "/create",
      icon: PlusSquare,
      label: "Add",
    },
    {
      href: "/meal-planner",
      icon: Calendar,
      label: "Plan",
    },
    {
      href: "/pantry",
      icon: Search,
      label: "Pantry",
    },
  ];

  // Only show on mobile and when authenticated (we assume authenticated if viewing these pages mostly, 
  // but layout check is better. Since this is client component, we can't easily check auth state without flickering 
  // or prop drilling. For now, render it, and rely on layout to only show it for authenticated users or handle redirects)
  // Actually, best to put this in the layout but only render if authenticated? 
  // Or just render it and let unauthenticated users see it but get redirected?
  // Let's keep it simple.

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

