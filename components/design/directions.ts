// Plain module (no "use client") so server components can read it too.
export type DirectionId = "workspace" | "cookbook" | "spaces";

export const DIRECTIONS: {
  id: DirectionId;
  name: string;
  summary: string;
}[] = [
  {
    id: "workspace",
    name: "Workspace",
    summary: "A sidebar that holds everything. Filters become collections, and the library gets a dense list view.",
  },
  {
    id: "cookbook",
    name: "Cookbook",
    summary: "Three sections: Cook, Plan, Shop. Big photos on shelves, and one search box that also does pantry matching.",
  },
  {
    id: "spaces",
    name: "Spaces",
    summary: "Two spaces in a floating dock. The meal plan and the shopping list share one Week screen.",
  },
];
