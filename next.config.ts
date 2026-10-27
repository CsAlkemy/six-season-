import type { NextConfig } from "next";

const config: NextConfig = {
  // Bangla is the default storefront; English lives at /en.
  async redirects() {
    return [{ source: "/", destination: "/bn", permanent: false }];
  },
  experimental: {
    // Product photos are resized to WebP in the browser before upload, so 4 MB is plenty.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default config;
