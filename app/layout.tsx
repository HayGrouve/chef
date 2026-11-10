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
import { siteUrl } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

// Headings (the `font-display` utility). Bricolage has no Cyrillic, so
// Bulgarian letters fall through to Geist instead of the system font.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["Geist", "Geist Fallback", "system-ui", "sans-serif"],
});

const NAME = "Онова за кухнята";
const TITLE = `${NAME} | Твоята готварска книга`;
const DESCRIPTION =
  "Рецептите ти, планът за седмицата и списъкът за пазаруване на едно място.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: TITLE,
    template: `%s | ${NAME}`,
  },
  description: DESCRIPTION,
  applicationName: NAME,
  openGraph: {
    type: "website",
    locale: "bg_BG",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    siteName: NAME,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
      lang="bg"
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
              Към съдържанието
            </a>
            <Navbar />
            {/* pb-16 clears the mobile tab bar, which cook mode hides */}
            <div className="pb-16 md:pb-0 has-[[data-cook-mode]]:pb-0 min-h-screen flex flex-col">
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <AuthenticatedMobileNav />
            {/* Long enough to reach the Undo button on a toast */}
            <Toaster position="top-center" duration={6000} />
            <GlobalCommandPalette />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
