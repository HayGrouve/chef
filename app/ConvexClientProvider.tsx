"use client";

import { ReactNode, useMemo } from "react";
import { Authenticated, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
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
        // The shadcn base theme reads the app's CSS tokens, so Clerk follows
        // the Cookbook palette in light and dark mode without overrides.
        baseTheme: shadcn,
        variables: {
          borderRadius: "0.75rem",
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
          headerTitle: "font-display text-2xl font-bold tracking-tight",
          formButtonPrimary: "rounded-full",
          socialButtonsBlockButton: "rounded-full",
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
