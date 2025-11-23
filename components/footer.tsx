"use client";

import Link from "next/link";
import { ChefHat } from "lucide-react";
import { InstallPwaButton } from "./install-pwa-button";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold">CHEF</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto md:mx-0">
              Your personal digital cookbook. Organize recipes, plan meals, and
              simplify your cooking journey.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/meal-planner" className="hover:text-foreground transition-colors">
                  Meal Planner
                </Link>
              </li>
              <li>
                <Link href="/shopping-list" className="hover:text-foreground transition-colors">
                  Shopping List
                </Link>
              </li>
              {/* Placeholders for standard pages */}
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Get the App</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Install CHEF on your device for the best experience.
            </p>
            <InstallPwaButton />
          </div>
        </div>

        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CHEF. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

