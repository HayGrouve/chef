"use client";

// PROTOTYPE — "Always in my kitchen": a light staples list (not a full
// inventory) that the hub uses to work out what you already have.
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STAPLE_SUGGESTIONS } from "./hooks";

export function StaplesCard({
  staples,
  onAdd,
  onRemove,
  onRestore,
}: {
  staples: string[];
  onAdd: (value: string) => boolean;
  onRemove: (value: string) => void;
  onRestore: (list: string[]) => void;
}) {
  const [value, setValue] = useState("");
  const suggestions = STAPLE_SUGGESTIONS.filter((s) => !staples.includes(s));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow "salt, pepper, oil" in one go
    value.split(",").forEach((v) => onAdd(v));
    setValue("");
  };

  const remove = (item: string) => {
    const before = staples;
    onRemove(item);
    toast(`Removed ${item} from staples`, {
      action: { label: "Undo", onClick: () => onRestore(before) },
    });
  };

  return (
    <Card className="h-full gap-4 p-5">
      <div>
        <h2 className="font-semibold leading-tight">Always in my kitchen</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Staples you rarely run out of. We&apos;ll skip them when you shop.
        </p>
      </div>

      {staples.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Your staples">
          {staples.map((s) => (
            <li
              key={s}
              className="flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-sm text-foreground"
            >
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                aria-label={`Remove ${s}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a staple, e.g. cumin"
          aria-label="Add a staple"
          className="h-9"
        />
        <Button type="submit" size="sm" variant="secondary" className="h-9" disabled={!value.trim()}>
          Add
        </Button>
      </form>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {staples.length === 0 ? "Tap the ones you always have" : "Suggestions"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAdd(s)}
                className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
