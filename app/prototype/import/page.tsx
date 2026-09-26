// PROTOTYPE — Smart Import route (/prototype/import). Accepts ?url= or ?text=
// to prefill the source, so it could later back a PWA share target.
import type { Metadata } from "next";
import { SmartImport } from "@/components/prototype/import/SmartImport";

export const metadata: Metadata = {
  title: "CHEF | Import a recipe",
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string | string[]; text?: string | string[] }>;
}) {
  const params = await searchParams;
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

  return (
    <main className="container mx-auto max-w-3xl p-4">
      <SmartImport initialUrl={first(params.url)} initialText={first(params.text)} />
    </main>
  );
}
