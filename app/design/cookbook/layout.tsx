import { Bricolage_Grotesque } from "next/font/google";
import { DirectionTheme } from "@/components/design/DirectionTheme";
import { CookbookShell } from "@/components/design/cookbook/Shell";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });

export default function CookbookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DirectionTheme className={`dir-cookbook ${display.variable}`} />
      <CookbookShell>{children}</CookbookShell>
    </>
  );
}
