import type { Auth, UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";

// Queries, mutations and actions alike
type Ctx = { auth: Auth };

/**
 * Origins allowed to mint a token for this deployment, from the comma
 * separated `CLERK_AUTHORIZED_PARTIES`. Prod only, once the онова за cutover
 * lands ("https://kuhnyata.onovaza.com"); unset on dev and previews, which
 * turns the `azp` check off.
 */
function authorizedParties(): string[] {
  return (
    process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
      .map((party) => party.trim())
      .filter(Boolean) ?? []
  );
}

/**
 * The caller's identity, or null when signed out. The only
 * `getUserIdentity()` call in `convex/` (an ESLint rule keeps it that way).
 * Every онова за subdomain shares one Clerk session, so once authorized
 * parties are set, a token minted on another subdomain reads as signed out.
 */
export async function getIdentity(ctx: Ctx): Promise<UserIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const parties = authorizedParties();
  if (
    parties.length > 0 &&
    (typeof identity.azp !== "string" || !parties.includes(identity.azp))
  ) {
    return null;
  }
  return identity;
}

/** The caller's Clerk user id (`subject`), or null when signed out. */
export async function getUserId(ctx: Ctx): Promise<string | null> {
  return (await getIdentity(ctx))?.subject ?? null;
}

/** The caller's Clerk user id (`subject`); throws when signed out. */
export async function requireUserId(
  ctx: Ctx,
  message = "Unauthenticated",
): Promise<string> {
  const userId = await getUserId(ctx);
  if (!userId) throw new ConvexError(message);
  return userId;
}
