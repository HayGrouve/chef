"use client";

// Navbar buttons that open the ⌘K palette: a search-field lookalike on wide
// screens (next to the logo), an icon on phones (no keyboard shortcut there).
// Neither shows in between, where the centered nav links need the room; the
// shortcut still works.
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, openCommandPalette, useModKey } from "./shared";

export function CommandPaletteTrigger() {
  const modKey = useModKey();

  return (
    <Button
      variant="outline"
      className="hidden w-56 justify-start gap-2 px-3 font-normal text-muted-foreground has-[>svg]:px-3 xl:flex"
      onClick={() => openCommandPalette()}
      aria-label="Search and quick actions"
    >
      <Search />
      <span className="flex-1 text-left">Search recipes…</span>
      {modKey && (
        <span className="flex gap-0.5">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </span>
      )}
    </Button>
  );
}

export function CommandPaletteIconTrigger() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground md:hidden"
      aria-label="Search and quick actions"
      onClick={() => openCommandPalette()}
    >
      <Search />
    </Button>
  );
}
