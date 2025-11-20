import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hearty-kookabura-538.convex.cloud",
      },
    ],
  },
};

export default nextConfig;
