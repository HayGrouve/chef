import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";

import { ThemeProvider } from "@/components/theme-provider";

import { AuthenticatedMobileNav } from "@/components/authenticated-mobile-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { GlobalCommandPalette } from "@/components/command-palette/GlobalCommandPalette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headings (the `font-display` utility).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chef-black.vercel.app"),
  title: {
    default: "CHEF | Your Personal Cookbook",
    template: "%s | CHEF",
  },
  description:
    "Organize your recipes, plan your weekly meals, and manage your shopping list with CHEF.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chef-black.vercel.app",
    title: "CHEF | Your Personal Cookbook",
    description:
      "Organize your recipes, plan your weekly meals, and manage your shopping list with CHEF.",
    siteName: "CHEF",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "CHEF App Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHEF | Your Personal Cookbook",
    description:
      "Organize your recipes, plan your weekly meals, and manage your shopping list with CHEF.",
  },
};

// Matches --background in each theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables live on <html> because Tailwind reads --font-sans
    // there; on <body> the app silently fell back to the system font.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable}`}
    >
      <body className="antialiased">
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
            >
              Skip to content
            </a>
            <Navbar />
            <div className="pb-16 md:pb-0 min-h-screen flex flex-col">
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <AuthenticatedMobileNav />
            <Toaster position="top-center" />
            <GlobalCommandPalette />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
