import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

/** Only same-site return addresses; Clerk shows a blank page on malformed ones. */
function isSafeRedirect(target: string, origin: string) {
  try {
    return new URL(target, origin).origin === origin;
  } catch {
    return false;
  }
}

export default clerkMiddleware(async (auth, request) => {
  if (isAuthPage(request)) {
    const target = request.nextUrl.searchParams.get("redirect_url");
    if (target !== null && !isSafeRedirect(target, request.nextUrl.origin)) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("redirect_url");
      return NextResponse.redirect(url);
    }
  }
  if (isProtectedRoute(request) || !isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
