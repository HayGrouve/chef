"use client";

// Mounts the ⌘K palette for signed-in users only, so signed-out visitors get
// no listeners and no queries.
import { useConvexAuth } from "convex/react";
import { CommandPalette } from "./CommandPalette";

export function GlobalCommandPalette() {
  const { isAuthenticated } = useConvexAuth();
  return isAuthenticated ? <CommandPalette /> : null;
}
