import type { Metadata } from "next";
export const metadata: Metadata = { title: "Поверителност" };

export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Поверителност</h1>
      <p className="mb-4">
        В Онова за кухнята пазим личните ти данни сериозно.
      </p>
      <p className="text-muted-foreground">
        Пълният текст скоро ще е в онова за, на onovaza.com.
      </p>
    </div>
  );
}

