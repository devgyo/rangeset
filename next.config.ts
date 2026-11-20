import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true, remotePatterns: [{ protocol: "https", hostname: "images.arcteryx.com" }] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
