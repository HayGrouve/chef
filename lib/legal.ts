/**
 * Кухнята's privacy and terms live on the hub's shared legal pages, in their
 * own `#kuhnyata` sections (HayGrouve/onova-za#67). `/privacy` and `/terms`
 * 308 there (next.config.ts) and every link points straight at them.
 */
export const PRIVACY_URL = "https://onovaza.com/poveritelnost#kuhnyata";
export const TERMS_URL = "https://onovaza.com/usloviya#kuhnyata";

export const legalRedirects = [
  { source: "/privacy", destination: PRIVACY_URL, permanent: true },
  { source: "/terms", destination: TERMS_URL, permanent: true },
];
