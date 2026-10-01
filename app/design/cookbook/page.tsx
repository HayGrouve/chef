import { Suspense } from "react";
import { CookbookHome } from "@/components/design/cookbook/Home";

export default function Page() {
  return (
    <Suspense>
      <CookbookHome />
    </Suspense>
  );
}
