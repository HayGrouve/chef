import type { AuthConfig } from "convex/server";

// Clerk's Frontend API URL, per deployment. Chef's own Clerk dev instance on
// both deployments until the онова за cutover, then https://clerk.onovaza.com
// in prod. Set it before a push or deploy: `npx convex env set
// CLERK_JWT_ISSUER_DOMAIN <url>` (add `--prod` for prod).
const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!issuer) {
  throw new Error("CLERK_JWT_ISSUER_DOMAIN is not set on this Convex deployment.");
}

// `customJwt` passes the token's claims through as they are, so `azp` (which
// convex/lib/auth.ts checks) and `picture` reach `getUserIdentity()`.
export default {
  providers: [
    {
      type: "customJwt",
      issuer,
      jwks: `${issuer}/.well-known/jwks.json`,
      algorithm: "RS256",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
