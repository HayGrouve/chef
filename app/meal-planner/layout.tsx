import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Plan your weekly meals with ease",
  title: "Meal planner",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
