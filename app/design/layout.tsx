import type { Metadata } from "next";
import "./design.css";
import { PrototypeStrip } from "@/components/design/PrototypeStrip";

export const metadata: Metadata = {
  title: "Design prototypes",
  robots: { index: false },
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PrototypeStrip />
      {children}
    </>
  );
}
