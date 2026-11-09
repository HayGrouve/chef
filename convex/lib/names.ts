/** Shown on recipes when a new profile's token has no name. Public. */
export const FALLBACK_NAME = "Готвач";

/**
 * The Clerk name to store on `users.name`, from Сметката's
 * `shared/host-profile.ts`. Undefined means leave the stored name alone: an
 * empty name never overwrites one, and an unchanged name writes nothing.
 */
export function nextSyncedAuthName(
  storedName: string | null | undefined,
  identityName: string | null | undefined,
): string | undefined {
  const next = identityName?.trim();
  if (!next) return undefined;
  if (storedName?.trim() === next) return undefined;
  return next;
}
