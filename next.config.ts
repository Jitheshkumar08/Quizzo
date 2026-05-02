import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add empty turbopack config to use Turbopack without webpack conflicts
  turbopack: {},
  // Increase server actions body size limit for PDF uploads (20MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
