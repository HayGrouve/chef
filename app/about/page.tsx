import { ChefHat, Heart, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

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
        <h1 className="text-4xl font-bold mb-4">About CHEF</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your personal digital cookbook designed to make cooking simpler, more
          organized, and more enjoyable.
        </p>
      </div>

      {/* Mission Section */}
      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            We believe that cooking should be a joy, not a chore. In a world of
            endless recipe blogs and cluttered screenshots, CHEF provides a
            clean, distraction-free space for your culinary creativity.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you&apos;re a meal prep pro or just learning to boil water,
            our goal is to help you organize your kitchen life so you can focus
            on what matters most: the food and the people you share it with.
          </p>
        </div>
        <div className="relative bg-muted rounded-2xl overflow-hidden aspect-video md:aspect-square shadow-lg">
          <Image
            src="/mission.png"
            alt="Cooking with CHEF"
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose CHEF?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card border rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Organization</h3>
            <p className="text-muted-foreground">
              Tag, filter, and search your recipes instantly. No more digging
              through old bookmarks.
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Built for You</h3>
            <p className="text-muted-foreground">
              Private by default. Your recipes are yours alone until you decide
              to share them with the world.
            </p>
          </div>
          <div className="bg-card border rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Community Sharing</h3>
            <p className="text-muted-foreground">
              Share your masterpieces with friends and family via simple, public
              links.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Cooking?</h2>
        <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
          Join thousands of home cooks organizing their kitchen life with CHEF.
        </p>
        <Link href="/sign-up">
          <Button size="lg" variant="secondary" className="font-semibold">
            Get Started for Free
          </Button>
        </Link>
      </div>
    </div>
  );
}
