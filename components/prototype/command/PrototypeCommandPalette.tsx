"use client";

// PROTOTYPE — global ⌘K palette, mounted in the root layout. Does nothing
// unless the "commandPalette" prototype flag is on (or you're on /prototype).
import { usePathname } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { usePrototypeFlag } from "@/components/prototype/flags";
import { CommandPalette } from "./CommandPalette";

export function PrototypeCommandPalette() {
  const { isAuthenticated } = useConvexAuth();
  const pathname = usePathname();
  const flagOn = usePrototypeFlag("commandPalette");

  const active = isAuthenticated && (flagOn || pathname.startsWith("/prototype"));
  // When inactive nothing is mounted: no listeners, no queries.
  return active ? <CommandPalette /> : null;
}
