"use client";

// Navbar button that opens the ⌘K palette: a compact pill on wide screens, an
// icon on phones (no keyboard shortcut there). Hidden in between, where the
// centered nav links need the room; the shortcut still works.
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, openCommandPalette, useModKey } from "./shared";

export function CommandPaletteTrigger() {
  const modKey = useModKey();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 font-normal text-muted-foreground xl:flex"
        onClick={() => openCommandPalette()}
        aria-label="Search and quick actions"
      >
        <Search className="h-4 w-4" />
        {modKey && (
          <span className="flex gap-0.5">
            <Kbd>{modKey}</Kbd>
            <Kbd>K</Kbd>
          </span>
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Search and quick actions"
        onClick={() => openCommandPalette()}
      >
        <Search className="h-5 w-5" />
      </Button>
    </>
  );
}
