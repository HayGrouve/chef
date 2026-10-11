import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Your shopping list for the week",
  title: "Shopping list",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
