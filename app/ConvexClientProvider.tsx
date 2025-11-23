"use client";

import { ReactNode, useMemo } from "react";
import { Authenticated, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { UserSync } from "@/components/UserSync";
import { shadcn } from "@clerk/themes";

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn(
        "NEXT_PUBLIC_CONVEX_URL not found, using placeholder for build"
      );
      return new ConvexReactClient("https://placeholder.convex.cloud");
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  const clerkKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder";

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      appearance={{
        baseTheme: shadcn,
        variables: {
          // Primary Orange matching oklch(0.6 0.18 45)
          colorPrimary: "#EA580C",
          colorText: "#1F2937",
          colorTextSecondary: "#4B5563", // Ensure secondary text is visible
          colorBackground: "#FFF7ED", // warm orange-50
          colorInputBackground: "#FFFFFF",
          colorInputText: "#111827",
          borderRadius: "0.625rem",
          fontFamily: "var(--font-geist-sans)",
          fontFamilyButtons: "var(--font-geist-sans)",
        },
        layout: {
          socialButtonsPlacement: "bottom",
          showOptionalFields: false,
          termsPageUrl: "/terms",
          privacyPageUrl: "/privacy",
        },
        elements: {
          card: "shadow-lg border border-orange-100 bg-[#FFF7ED]", // Ensure background matches
          headerTitle: "text-2xl font-bold text-gray-900", // Force dark text
          headerSubtitle: "text-gray-600", // Force gray text
          formButtonPrimary:
            "bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 text-base font-semibold shadow-md transition-all",
          formFieldInput:
            "rounded-lg border-orange-200 bg-white text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all",
          formFieldLabel: "text-gray-700",
          footerActionLink: "text-orange-600 hover:text-orange-700 font-medium",
          socialButtonsBlockButton:
            "rounded-xl border-orange-200 bg-white hover:bg-orange-50 text-gray-700 transition-all",
          dividerLine: "bg-orange-200",
          dividerText: "text-gray-500",

          // Navbar & User Button specific overrides
          navbar: "bg-orange-50 border-r border-orange-100",
          navbarButton:
            "text-gray-600 hover:text-orange-600 hover:bg-orange-100",

          // User Profile Modal
          userPreviewMainIdentifier: "text-gray-900 font-semibold",
          userPreviewSecondaryIdentifier: "text-gray-600",
          userButtonPopoverCard:
            "bg-[#FFF7ED] border border-orange-100 shadow-xl text-gray-900",
          userButtonPopoverActionButton:
            "text-gray-700 hover:bg-orange-100 hover:text-orange-900",
          userButtonPopoverActionButtonIcon: "text-gray-500",
          userButtonPopoverFooter: "bg-orange-50/50 border-t border-orange-100",

          // Dropdowns/Selects
          scrollBox: "bg-[#FFF7ED]",

          // Ensure text is readable in all states
          identityPreviewText: "text-gray-700",
          identityPreviewEditButtonIcon: "text-gray-500",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Authenticated>
          <UserSync />
        </Authenticated>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
