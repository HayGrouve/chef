"use client";

// Catch-all for unexpected errors so users get a way back instead of a blank page.
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Нещо се обърка</h1>
      <p className="mt-2 text-muted-foreground">
        Опитай пак или се върни към рецептите си.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" onClick={reset}>
          Опитай пак
        </Button>
        <Button asChild>
          <Link href="/">Към рецептите</Link>
        </Button>
      </div>
    </div>
  );
}
