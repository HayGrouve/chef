import { Outfit } from "next/font/google";
import { DirectionTheme } from "@/components/design/DirectionTheme";
import { SpacesShell } from "@/components/design/spaces/Shell";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-spaces" });

export default function SpacesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DirectionTheme className={`dir-spaces ${outfit.variable}`} />
      <SpacesShell>{children}</SpacesShell>
    </>
  );
}
