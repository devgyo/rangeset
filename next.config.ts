import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.arcteryx.com" },
      { protocol: "https", hostname: "static.mammut.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const config = createNextIntlPlugin()(nextConfig);

export default process.env.ANALYZE === "true"
  ? bundleAnalyzer({openAnalyzer: false, analyzerMode: "json"})(config)
  : config;
