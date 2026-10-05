// Checks that keep recipe import from reaching private networks. Pure
// functions, shared by the import actions and the Node fetcher (safeFetch.ts).
import { ConvexError } from "convex/values";

/** Parses a link the user pasted, rejecting non-http(s) and obviously private hosts. */
export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ConvexError("That doesn't look like a link. Paste the full address, starting with https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ConvexError("Only http and https links can be imported.");
  }
  // A trailing dot ("localhost.") is the same host; strip it before comparing
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  const privateHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    // IP literals: v6 is never needed for a recipe site; v4 must be public
    host.startsWith("[") ||
    isReservedIPv4(host);
  if (privateHost) throw new ConvexError("That link can't be imported.");
  return url;
}

/**
 * Loopback, private, link-local, CGNAT, benchmarking, multicast and other
 * non-public IPv4 ranges. Returns false for anything that isn't dotted IPv4.
 */
export function isReservedIPv4(host: string): boolean {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b, c] = match.slice(1).map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

/** "::ffff:7f00:1" -> [0, 0, 0, 0, 0, 0xffff, 0x7f00, 1]; null if not IPv6. */
function parseIPv6(address: string): number[] | null {
  let text = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  // An embedded IPv4 tail ("::ffff:127.0.0.1") becomes two hextets
  const v4 = text.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    text = text.slice(0, -v4[0].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const parts = [...head, ...Array(fill).fill("0"), ...tail];
  if (parts.length !== 8 || !parts.every((p) => /^[0-9a-f]{1,4}$/.test(p))) return null;
  return parts.map((p) => parseInt(p, 16));
}

/**
 * True for any address (IPv4 or IPv6) a public recipe site would never live
 * at. Used on DNS results, so a public-looking hostname can't point inside.
 */
export function isReservedAddress(address: string): boolean {
  if (isReservedIPv4(address)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) return false;
  const h = parseIPv6(address);
  if (!h) return true; // Unparseable: refuse rather than guess
  const v4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  const zeroPrefix = (n: number) => h.slice(0, n).every((x) => x === 0);
  if (zeroPrefix(8)) return true; // ::
  if (zeroPrefix(7) && h[7] === 1) return true; // ::1
  if (zeroPrefix(5) && h[5] === 0xffff) return isReservedIPv4(v4(h[6], h[7])); // ::ffff:a.b.c.d
  if (zeroPrefix(6)) return true; // deprecated ::a.b.c.d
  if (h[0] === 0x64 && h[1] === 0xff9b) return isReservedIPv4(v4(h[6], h[7])); // NAT64
  if (h[0] === 0x2002) return isReservedIPv4(v4(h[1], h[2])); // 6to4
  return (
    (h[0] & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (h[0] & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (h[0] & 0xffc0) === 0xfec0 || // fec0::/10 site-local
    (h[0] & 0xff00) === 0xff00 || // multicast
    (h[0] === 0x2001 && h[1] === 0x0db8) || // documentation
    (h[0] === 0x0100 && h[1] === 0 && h[2] === 0 && h[3] === 0) // discard
  );
}
