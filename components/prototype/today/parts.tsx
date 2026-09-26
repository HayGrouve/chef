"use client";

// PROTOTYPE — small shared pieces for the "Today" hub (thumbs, section titles).
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Square recipe thumbnail; falls back to the recipe's initial on a tinted tile. */
export function RecipeThumb({
  title,
  imageUrl,
  className,
  sizes = "48px",
}: {
  title: string;
  imageUrl: string | null;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-primary",
        className
      )}
    >
      {imageUrl && !failed ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-semibold uppercase" aria-hidden>
          {title.trim().charAt(0) || "?"}
        </span>
      )}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  href,
  linkLabel,
  className,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary hover:underline"
        >
          {linkLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
