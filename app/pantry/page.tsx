import { redirect } from "next/navigation";

// Pantry search moved into the Cook search box: type the ingredients you have,
// separated by commas. Old links and bookmarks land there.
export default function PantryPage() {
  redirect("/");
}
