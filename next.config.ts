import type { NextConfig } from "next";
import { legalRedirects } from "./lib/legal";

const nextConfig: NextConfig = {
  redirects: async () => legalRedirects,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "descriptive-snail-667.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "hearty-kookabura-538.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
};

export default nextConfig;
