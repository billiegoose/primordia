import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type-checking and linting during `next build` — these run manually instead.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Tell webpack not to bundle bun:sqlite. It's only available at runtime in
  // the Bun environment. The sqlite adapter is always used (no Neon fallback).
  // (webpack is used for `next build`; turbopack is used for `next dev --turbopack`)
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), "bun:sqlite"];
    return config;
  },

  // Tell Turbopack not to bundle bun:sqlite either — same reason as above.
  turbopack: {
    resolveAlias: {
      "bun:sqlite": "bun:sqlite",
    },
  },
};

export default nextConfig;
