import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The link may be broken, or the page has moved.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">
          <ArrowLeft /> Back to Cook
        </Link>
      </Button>
    </div>
  );
}
