import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Планирай ястията за седмицата.",
  title: "План за седмицата",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
