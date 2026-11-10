import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Списъкът ти за пазаруване за седмицата.",
  title: "Списък за пазаруване",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
