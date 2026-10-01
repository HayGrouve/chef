import { CookbookRecipe } from "@/components/design/cookbook/RecipeView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CookbookRecipe id={id} />;
}
