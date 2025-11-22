import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";

import { ThemeProvider } from "@/components/theme-provider";

import { AuthenticatedMobileNav } from "@/components/authenticated-mobile-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="pb-16 md:pb-0">{children}</div>
            <AuthenticatedMobileNav />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
