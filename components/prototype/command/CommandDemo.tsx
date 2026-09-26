"use client";

// PROTOTYPE — demo/explainer for the ⌘K command palette (/prototype/command).
import { Command, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setPrototypeFlag, usePrototypeFlag } from "@/components/prototype/flags";
import { Kbd, openCommandPalette, useModKey } from "./shared";

const TRY: { type: string; then: string; search: string }[] = [
  { type: "risotto", then: "↵ → Plan it… → Thursday dinner", search: "risotto" },
  { type: "chili", then: "↵ → Add ingredients to shopping list", search: "chili" },
  { type: "add milk", then: "↵ puts milk on the list (with Undo)", search: "add milk" },
  { type: "shop", then: "↵ jumps to the shopping list", search: "shop" },
  { type: "theme", then: "↵ switches light / dark", search: "theme" },
  { type: "(nothing)", then: "Tonight's meal and your recent recipes", search: "" },
];

export function CommandDemo() {
  const enabled = usePrototypeFlag("commandPalette");
  const mod = useModKey();

  return (
    <main className="container mx-auto max-w-2xl p-4 pb-12">
      <div className="my-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Command className="h-7 w-7 text-primary" /> Command palette
        </h1>
        <p className="mt-2 text-muted-foreground">
          A keyboard layer over the whole app. Find a recipe and plan it for a day, drop an item
          on the shopping list, or jump to any page without clicking through tabs. It&apos;s an
          experiment: it only helps if you come back often and like the keyboard.
        </p>
      </div>

      <Card className="gap-4 p-5">
        <Button size="lg" className="h-12 w-full justify-between text-base" onClick={() => openCommandPalette()}>
          <span className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Open command palette
          </span>
          {mod && (
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">
                {mod}
              </Kbd>
              <Kbd className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">
                K
              </Kbd>
            </span>
          )}
        </Button>

        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div>
            <Label htmlFor="cmd-flag" className="text-sm font-medium">
              Enable {mod === "Ctrl" ? "Ctrl+K" : "⌘K"} everywhere in the app
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Off: the shortcut only works on /prototype pages. Saved in this browser.
            </p>
          </div>
          <Switch
            id="cmd-flag"
            checked={enabled}
            onCheckedChange={(on) => setPrototypeFlag("commandPalette", on)}
          />
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Things to try
        </h2>
        <div className="divide-y rounded-lg border">
          {TRY.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => openCommandPalette(t.search)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
            >
              <code className="w-24 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">{t.type}</code>
              <span className="text-muted-foreground">{t.then}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tap a row to open the palette with it typed in. In nested steps, <Kbd>⌫</Kbd> on an
          empty input goes back, <Kbd>esc</Kbd> closes. Changes are real and every one has Undo.
        </p>
      </section>
    </main>
  );
}
