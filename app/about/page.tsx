import type { Metadata } from "next";
import { ChefHat, Heart, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = { title: "За кухнята" };

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl mb-4">За Онова за кухнята</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Твоята готварска книга: рецептите, планът за седмицата и списъкът за
          пазаруване на едно място.
        </p>
      </div>

      {/* Mission Section */}
      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Защо я има</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Готвенето трябва да е удоволствие, а не задължение. Вместо безкрайни
            блогове и разхвърляни скрийншоти, тук рецептите ти стоят подредени и
            без нищо излишно наоколо.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Дали готвиш за цялата седмица наведнъж или тепърва се учиш да вариш
            яйца, Кухнята поема подреждането, а ти мислиш за важното: храната и
            хората, с които я споделяш.
          </p>
        </div>
        <div className="relative bg-muted rounded-2xl overflow-hidden aspect-video md:aspect-square shadow-lg">
          <Image
            src="/mission.png"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
          />
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-20">
        <h2 className="font-display text-3xl font-bold tracking-tight text-center mb-12">
          Какво получаваш
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card border rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Подредени рецепти</h3>
            <p className="text-muted-foreground">
              Етикети, филтри и търсене за миг. Без ровене в стари отметки.
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Само твои</h3>
            <p className="text-muted-foreground">
              Рецептите са лични, докато сам не решиш да ги покажеш на всички.
            </p>
          </div>
          <div className="bg-card border rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">За споделяне</h3>
            <p className="text-muted-foreground">
              Изпрати любимите си рецепти на приятели и семейство с обикновен линк.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-12 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Готов ли си да готвиш?</h2>
        <p className="text-lg mb-8 max-w-xl mx-auto">
          Влез с Акаунта си в онова за и започни своята готварска книга.
        </p>
        <Button asChild size="lg" variant="secondary" className="font-semibold">
          <Link href="/sign-in">Вход</Link>
        </Button>
      </div>
    </div>
  );
}
