"use client";

// PROTOTYPE — slim bar that marks experimental pages and switches between them.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTOTYPES } from "./registry";

export function PrototypeBar() {
  const pathname = usePathname();
  // Cook mode is full screen, like the real one
  if (/^\/prototype\/cook\/[^/]+$/.test(pathname)) return null;

  return (
    <div className="border-b border-dashed border-primary/40 bg-primary/5">
      <div className="container mx-auto flex items-center gap-3 overflow-x-auto px-4 py-2 text-sm">
        <Link
          href="/prototype"
          className="flex shrink-0 items-center gap-1.5 font-semibold text-primary"
        >
          <FlaskConical className="h-4 w-4" />
          Prototypes
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <nav className="flex gap-1">
          {PROTOTYPES.map((p) => {
            const active = pathname.startsWith(p.href);
            return (
              <Link
                key={p.id}
                href={p.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                )}
              >
                {p.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
