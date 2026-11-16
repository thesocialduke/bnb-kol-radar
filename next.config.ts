import type { NextConfig } from "next";

// Every page is generated at build time from data/snapshot.db.
// The deployed site makes no API calls and needs no keys.
const nextConfig: NextConfig = {
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
