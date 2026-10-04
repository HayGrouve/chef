"use client";

import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Trash2,
  Heart,
  Pencil,
  ShoppingBasket,
  Share2,
  Play,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecipePhoto, formatMinutes } from "@/components/RecipeCard";
import { scaleIngredient } from "@/lib/recipe-text";
import { cn, pluralize } from "@/lib/utils";

const SCALES = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
];

function RecipeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const recipeId = params.id as Id<"recipes">;

  // Use getPublic for unauthenticated users, get for authenticated users
  const publicRecipe = useQuery(api.recipes.getPublic, { id: recipeId });
  const authenticatedRecipe = useQuery(api.recipes.get, { id: recipeId });

  // Use the appropriate recipe based on auth status
  const recipe = authenticatedRecipe ?? publicRecipe;

  const deleteRecipe = useMutation(api.recipes.remove);
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  const addBatchToShoppingList = useMutation(api.shoppingList.addBatch);
  const removeBatchFromShoppingList = useMutation(api.shoppingList.removeBatch);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adding, setAdding] = useState(false);

  // The scale lives in the URL (?scale=2) so a scaled recipe can be shared.
  const scaleParam = Number(searchParams.get("scale"));
  const scale = SCALES.some((s) => s.value === scaleParam) ? scaleParam : 1;
  const setScale = (value: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === 1) next.delete("scale");
    else next.set("scale", String(value));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  if (recipe === undefined) {
    return (
      <div className="container mx-auto max-w-5xl px-4 pt-6 md:pt-10">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="mt-6 h-14 w-3/4" />
        <Skeleton className="mt-5 h-5 w-2/3" />
        <Skeleton className="mt-10 aspect-[21/9] w-full rounded-2xl" />
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="container mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Recipe not found</h1>
        <p className="mt-2 text-muted-foreground">
          This recipe may be private or doesn’t exist.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">
            <ArrowLeft /> Back to Cook
          </Link>
        </Button>
      </div>
    );
  }

  const ingredients = recipe.ingredients.map((line) =>
    scale === 1 ? line : scaleIngredient(line, scale)
  );
  const isOwner = "isOwner" in recipe && recipe.isOwner;
  const facts = [
    { label: "Time", value: formatMinutes(recipe.cookingTime) },
    { label: "Difficulty", value: recipe.difficulty },
    { label: "Per serving", value: recipe.calories ? `${recipe.calories}\u00A0kcal` : null },
    { label: "Steps", value: String(recipe.steps.length) },
  ].filter((f) => f.value);

  const handleDelete = async () => {
    await deleteRecipe({ id: recipeId });
    setShowDeleteDialog(false);
    router.push("/");
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      const ids = await addBatchToShoppingList({
        ingredients,
        recipeId: recipe._id,
      });
      toast.success(`Added ${pluralize(ingredients.length, "ingredient")} to your shopping list`, {
        action: ids?.length
          ? {
              label: "Undo",
              onClick: () => removeBatchFromShoppingList({ ids }),
            }
          : undefined,
      });
    } catch {
      toast.error("Couldn’t add to your shopping list", { description: "Check your connection and try again." });
    } finally {
      setAdding(false);
    }
  };

  const goBack = () => {
    // Opened directly (shared link, new tab): there's nothing to go back to.
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/recipe/${recipe._id}`;
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Couldn’t copy the link", { description: "Copy it from the address bar instead." });
      }
    };
    const shareData = {
      title: `CHEF | ${recipe.title}`,
      text: recipe.description,
      url: url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        // Native share sheet opened, no need for feedback
      } catch (err) {
        // User cancelled or it failed, fallback to clipboard
        if ((err as Error).name !== "AbortError") await copyLink();
      }
    } else {
      // Fallback for desktop/unsupported browsers
      await copyLink();
    }
  };

  return (
    <article className="pb-16">
      <div className="container mx-auto max-w-5xl px-4 pt-6 md:pt-10">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <h1 className="mt-6 max-w-4xl text-balance break-words font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
          {recipe.title}
        </h1>
        {recipe.description && <ClampedText text={recipe.description} />}
        {recipe.authorName && (
          <p className="mt-4 text-sm">
            By{" "}
            <Link
              href={`/profile/${recipe.userId}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {recipe.authorName}
            </Link>
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Authenticated>
            <Button asChild size="lg">
              <Link href={`/recipe/${recipeId}/cook`}>
                <Play />
                Start cooking
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleAddToCart}
              disabled={adding}
              className="max-sm:w-10 max-sm:px-0"
              aria-label="Add to shopping list"
            >
              {adding ? <Loader2 className="animate-spin" /> : <ShoppingBasket />}
              <span className="max-sm:hidden">Add to list</span>
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              onClick={() => toggleFavorite({ id: recipeId })}
              aria-pressed={!!recipe.isFavorite}
              aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn(recipe.isFavorite && "fill-primary text-primary")} />
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button asChild size="lg">
              <Link href="/sign-in">
                <Play />
                Sign in to cook
              </Link>
            </Button>
          </Unauthenticated>
          {recipe.isPublic && (
            <Button size="icon-lg" variant="ghost" onClick={handleShare} aria-label="Share">
              <Share2 />
            </Button>
          )}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-lg" variant="ghost" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href={`/create?edit=${recipeId}`}>
                    <Pencil />
                    Edit recipe
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setShowDeleteDialog(true)}>
                  <Trash2 />
                  Delete recipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="container mx-auto mt-10 max-w-6xl px-4">
        {recipe.imageUrl && (
          <RecipePhoto
            src={recipe.imageUrl}
            alt={recipe.title}
            priority
            sizes="(max-width: 1200px) 100vw, 1152px"
            className="aspect-[16/9] rounded-2xl md:aspect-[21/9]"
          />
        )}
        {facts.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-y-4 md:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="border-l-2 border-primary/70 pl-4">
                <dt className="text-sm text-muted-foreground">{f.label}</dt>
                <dd className="font-display text-xl font-semibold tracking-tight">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="container mx-auto mt-14 grid max-w-5xl gap-12 px-4 md:grid-cols-[18rem_1fr]">
        <section className="md:sticky md:top-24 md:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight">Ingredients</h2>
            <div className="flex rounded-full bg-muted p-0.5" role="group" aria-label="Scale ingredients">
              {SCALES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScale(s.value)}
                  aria-pressed={scale === s.value}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                    scale === s.value && "bg-background text-foreground shadow-sm"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {ingredients.map((line, i) => (
              <li key={i} className="flex gap-3 leading-snug">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Method</h2>
          <ol className="mt-6 flex flex-col gap-8">
            {recipe.steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[3rem_1fr] gap-2">
                <span className="font-display text-3xl font-bold leading-none tabular-nums text-primary">
                  {i + 1}
                </span>
                <p className="max-w-[60ch] pt-1 text-[1.0625rem] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Filed under
              {recipe.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tags=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-muted px-3 py-1 hover:text-foreground"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              recipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

/** Shows up to three lines, with a "Show more" toggle only when the text is cut off. */
function ClampedText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="mt-5 max-w-[60ch]">
      <p
        ref={ref}
        className={cn(
          "whitespace-pre-line text-lg leading-relaxed text-muted-foreground",
          !expanded && "line-clamp-3"
        )}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function RecipeDetailClient() {
  return (
    <Suspense>
      <RecipeDetailContent />
    </Suspense>
  );
}
