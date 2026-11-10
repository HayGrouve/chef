import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Няма такава страница" };

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Няма такава страница</h1>
      <p className="mt-2 text-muted-foreground">
        Линкът може да е грешен или страницата да е преместена.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">
          <ArrowLeft /> Към рецептите
        </Link>
      </Button>
    </div>
  );
}
