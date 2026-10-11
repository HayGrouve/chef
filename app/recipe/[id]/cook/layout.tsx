import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Only public titles: metadata is rendered without the visitor's auth
  const recipe = await fetchQuery(api.recipes.getPublic, { id }).catch(() => null);
  return { title: recipe ? `Cooking ${recipe.title}` : "Cook mode" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
