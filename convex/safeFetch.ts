"use node";
// Outbound fetches for recipe import. Runs in Node so the DNS answer can be
// checked: the socket connects only to the address that passed the check,
// which also defeats DNS rebinding (a second, different answer at connect time).
import { v, ConvexError } from "convex/values";
import { internalAction } from "./_generated/server";
import { lookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import type { LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { isReservedAddress, parsePublicUrl } from "./publicUrl";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

class BlockedHostError extends Error {
  code = "EBLOCKEDHOST";
}

/** dns.lookup that refuses hostnames resolving to any non-public address. */
const safeLookup = ((hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, "", 0);
    if (addresses.length === 0 || addresses.some((a) => isReservedAddress(a.address))) {
      return callback(new BlockedHostError(hostname), "", 0);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (options.all) return (callback as any)(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}) as LookupFunction;

function get(url: URL, accept: string, signal: AbortSignal) {
  const client = url.protocol === "https:" ? https : http;
  return new Promise<http.IncomingMessage>((resolve, reject) => {
    const request = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: {
          Accept: accept,
          "Accept-Encoding": "gzip, deflate, br",
          // Many recipe sites block unknown clients
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      resolve
    );
    request.on("error", reject);
    request.end();
  });
}

/** Reads (and decompresses) a body, stopping as soon as it passes maxBytes. */
async function readBody(response: http.IncomingMessage, maxBytes: number) {
  const encoding = String(response.headers["content-encoding"] ?? "").toLowerCase();
  const body: Readable =
    encoding === "gzip" || encoding === "x-gzip"
      ? response.pipe(zlib.createGunzip())
      : encoding === "br"
        ? response.pipe(zlib.createBrotliDecompress())
        : encoding === "deflate"
          ? response.pipe(zlib.createInflate())
          : response;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of body) {
    total += chunk.length;
    if (total > maxBytes) {
      response.destroy();
      throw new ConvexError("That page is too large to import.");
    }
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export const fetchPublic = internalAction({
  args: { url: v.string(), maxBytes: v.number(), accept: v.string() },
  returns: v.object({ bytes: v.bytes(), contentType: v.string(), url: v.string() }),
  handler: async (_ctx, args): Promise<{ bytes: ArrayBuffer; contentType: string; url: string }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      // Follow redirects by hand so every hop gets the same checks
      let target = parsePublicUrl(args.url);
      for (let hop = 0; ; hop++) {
        const response = await get(target, args.accept, controller.signal);
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume(); // discard the redirect body
          if (hop >= MAX_REDIRECTS) throw new ConvexError("That link redirects too many times.");
          target = parsePublicUrl(new URL(location, target).toString());
          continue;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          throw new ConvexError(
            `The site refused the request (HTTP ${status}). Try copying the recipe text instead.`
          );
        }
        if (Number(response.headers["content-length"] ?? 0) > args.maxBytes) {
          response.destroy();
          throw new ConvexError("That page is too large to import.");
        }
        return {
          bytes: await readBody(response, args.maxBytes),
          contentType: String(response.headers["content-type"] ?? ""),
          url: target.toString(),
        };
      }
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      if (error instanceof BlockedHostError) throw new ConvexError("That link can't be imported.");
      throw new ConvexError("Couldn't reach that page. Check the link or paste the recipe text instead.");
    } finally {
      clearTimeout(timer);
    }
  },
});
