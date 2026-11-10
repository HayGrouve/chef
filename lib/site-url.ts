/**
 * The site's own origin, for `metadataBase` and absolute links.
 * `NEXT_PUBLIC_SITE_URL` (set in Production at the cutover), then Vercel's
 * production domain, then local dev.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env) {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const production = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production}`;
  return "http://localhost:3000";
}
