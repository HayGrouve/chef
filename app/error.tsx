"use client";

// Catch-all for unexpected errors so users get a way back instead of a blank page.
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        Try again, or head back to your recipes.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/">Back to Cook</Link>
        </Button>
      </div>
    </div>
  );
}
