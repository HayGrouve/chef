// PROTOTYPE — experimental routes. Everything under /prototype can be deleted
// without affecting the main app.
import type { Metadata } from "next";
import { PrototypeBar } from "@/components/prototype/PrototypeBar";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Prototypes",
  robots: { index: false, follow: false },
};

export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <PrototypeBar />
      {children}
    </TooltipProvider>
  );
}
