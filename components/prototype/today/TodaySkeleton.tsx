// PROTOTYPE — loading skeleton that mirrors the "Today" hub layout.
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipeCardSkeleton } from "@/components/RecipeCardSkeleton";

export function TodaySkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-y-8">
        <Card className="gap-0 overflow-hidden py-0 md:flex-row lg:col-span-2">
          <Skeleton className="aspect-video rounded-none md:aspect-auto md:h-72 md:w-2/5" />
          <div className="flex-1 space-y-3 p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-1.5 w-full" />
            <div className="flex gap-2 pt-4">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </Card>
        <Skeleton className="h-60 w-full rounded-xl lg:h-auto" />
        <div className="space-y-3 lg:col-span-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
