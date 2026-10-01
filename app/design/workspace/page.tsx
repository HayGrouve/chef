import { Suspense } from "react";
import { WorkspaceLibrary } from "@/components/design/workspace/Library";

export default function Page() {
  return (
    <Suspense>
      <WorkspaceLibrary />
    </Suspense>
  );
}
