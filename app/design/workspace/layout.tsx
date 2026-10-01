import { Suspense } from "react";
import { DirectionTheme } from "@/components/design/DirectionTheme";
import { WorkspaceShell } from "@/components/design/workspace/Shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DirectionTheme className="dir-workspace" />
      <Suspense>
        <WorkspaceShell>{children}</WorkspaceShell>
      </Suspense>
    </>
  );
}
