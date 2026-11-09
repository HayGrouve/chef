"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Authenticated } from "convex/react";
import { InstallPwaButton } from "./install-pwa-button";

const links = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  const pathname = usePathname();
  // Cook mode is a full-screen view; a footer below it only invites stray scrolling
  if (pathname?.endsWith("/cook")) return null;
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CHEF</p>
        <nav className="flex items-center gap-4">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
          {/* Your page and, later, your data; the account itself lives in the Акаунт */}
          <Authenticated>
            <Link href="/profile/edit" className="hover:text-foreground transition-colors">
              Настройки
            </Link>
          </Authenticated>
          <InstallPwaButton variant="ghost" className="h-auto p-0 font-normal text-muted-foreground hover:text-foreground hover:bg-transparent" />
        </nav>
      </div>
    </footer>
  );
}
