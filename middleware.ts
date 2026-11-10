import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { signInReturnUrl } from "@/lib/sign-in-redirect";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share(.*)",
  "/about",
  "/terms",
  "/privacy",
  "/recipe(.*)",
  "/profile/(.*)",
]);

const isProtectedRoute = createRouteMatcher([
  // Cooking needs an account; the rest of a recipe page is public
  "/recipe/(.*)/cook(.*)",
  // Public profiles are readable by anyone, but editing your own isn't
  "/profile/edit(.*)",
]);

// Nobody signs in inside the app: these paths only send you to Clerk's
// sign-in (onovaza.com/vhod in production once the Акаунт is live, the Account
// Portal of the Clerk dev instance until then) and back.
const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

/**
 * Origins allowed to mint the session token, from the comma separated
 * `CLERK_AUTHORIZED_PARTIES` (Production only, from the cutover:
 * "https://kuhnyata.onovaza.com"). Undefined when unset, so previews and
 * localhost work.
 */
function authorizedParties(): string[] | undefined {
  const parties = process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
    .map((party) => party.trim())
    .filter(Boolean);
  return parties?.length ? parties : undefined;
}

export default clerkMiddleware(
  async (auth, request) => {
    if (isAuthPage(request)) {
      const returnBackUrl = signInReturnUrl(
        request.nextUrl.searchParams.get("redirect_url"),
        request.nextUrl.origin
      );
      const { userId, redirectToSignIn } = await auth();
      if (userId) return NextResponse.redirect(returnBackUrl);
      return redirectToSignIn({ returnBackUrl });
    }
    if (isProtectedRoute(request) || !isPublicRoute(request)) {
      await auth.protect();
    }
  },
  { authorizedParties: authorizedParties() }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
