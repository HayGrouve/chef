"use client";

// PROTOTYPE — index of experimental directions.
import Link from "next/link";
import { ArrowRight, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PROTOTYPES } from "@/components/prototype/registry";
import { setPrototypeFlag, usePrototypeFlag } from "@/components/prototype/flags";

export default function PrototypeIndex() {
  const paletteEnabled = usePrototypeFlag("commandPalette");

  return (
    <main className="container mx-auto max-w-5xl p-4 pb-12">
      <div className="my-6 max-w-2xl">
        <h1 className="text-3xl font-bold">Prototypes</h1>
        <p className="mt-2 text-muted-foreground">
          Four working directions for CHEF, built on real data. Each one is
          isolated under <code className="text-sm">/prototype</code>, so the
          current app is unchanged. Try them next to the pages they would replace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PROTOTYPES.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{p.name}</h2>
                    <Badge variant="outline" className="font-normal">
                      {p.direction}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.summary}</p>
                </div>
              </div>

              <div className="text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Try this
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {p.tryThis.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Replaces:</span> {p.replaces}
              </p>

              <div className="mt-auto flex items-center justify-between gap-3">
                {p.id === "command" ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="palette-flag"
                      checked={paletteEnabled}
                      onCheckedChange={(on) => setPrototypeFlag("commandPalette", on)}
                    />
                    <Label htmlFor="palette-flag" className="text-sm">
                      Enable ⌘K everywhere
                    </Label>
                  </div>
                ) : (
                  <span />
                )}
                <Button asChild size="sm">
                  <Link href={p.href}>
                    Open <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Keyboard className="h-4 w-4" />
        Prototypes use your real recipes, plan and shopping list, so changes you make here are real.
      </p>
    </main>
  );
}
