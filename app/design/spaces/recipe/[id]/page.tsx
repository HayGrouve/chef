import { SpacesRecipe } from "@/components/design/spaces/RecipeView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpacesRecipe id={id} />;
}
