import type { Metadata } from "next";
export const metadata: Metadata = { title: "Условия за ползване" };

export default function TermsPage() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Условия за ползване</h1>
      <p className="mb-4">
        Добре дошъл в Онова за кухнята. Като ползваш приложението, се съгласяваш с тези условия.
      </p>
      <p className="text-muted-foreground">
        Пълният текст скоро ще е в онова за, на onovaza.com.
      </p>
    </div>
  );
}

