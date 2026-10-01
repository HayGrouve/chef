import { WorkspaceRecipe } from "@/components/design/workspace/RecipeView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceRecipe id={id} />;
}
