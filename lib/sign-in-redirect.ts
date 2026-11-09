/**
 * Where `/sign-in?redirect_url=...` sends you back to, as an absolute URL on
 * this origin. Only same-site targets; an off-site or malformed one (Clerk
 * shows a blank page on those) falls back to the start page.
 */
export function signInReturnUrl(target: string | null, origin: string): string {
  if (target !== null) {
    try {
      const url = new URL(target, origin);
      if (url.origin === origin) return url.toString();
    } catch {
      // Malformed: fall through to the start page
    }
  }
  return new URL("/", origin).toString();
}
