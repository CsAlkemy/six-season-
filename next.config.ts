import type { NextConfig } from "next";

const config: NextConfig = {
  // No "x-powered-by: Next.js" on every answer.
  poweredByHeader: false,
  // The store is in English (lib/types.ts STORE_LANG) and its addresses carry no language. Old /bn and /en addresses,
  // in search results and shared links, go to the same page for good.
  async redirects() {
    return ["bn", "en"].flatMap((lang) => [
      { source: `/${lang}`, destination: "/", permanent: true },
      { source: `/${lang}/:path*`, destination: "/:path*", permanent: true },
    ]);
  },
  // Browsers take files only as the type they're sent as, never show the store inside another site's frame, and tell
  // other sites only which domain a visitor came from.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Uploaded photos are resized for each screen (lib/photo-sizes.ts). Only Vercel Blob's upload folders the admin
  // writes to, so the resizer isn't open to pictures from anywhere.
  images: {
    remotePatterns: ["products", "blog", "home"].map((folder) => ({ protocol: "https" as const, hostname: "*.public.blob.vercel-storage.com", pathname: `/${folder}/**` })),
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Uploads are at most 1400px (components/admin/image-upload.ts), so no copy is made wider than that.
    deviceSizes: [640, 750, 828, 1080, 1200, 1440],
  },
  // HarfBuzz (share-image text, lib/og.ts) finds its .wasm beside itself; bundled, that path would point at a browser asset.
  serverExternalPackages: ["harfbuzzjs"],
  experimental: {
    // Product photos are resized to WebP in the browser before upload, so 4 MB is plenty.
    serverActions: { bodySizeLimit: "4mb" },
    agentUpgrade: "security",
    // app/global-not-found.tsx: addresses outside /bn and /en get a real 404, not an error from the store layout.
    globalNotFound: true,
  },
};

export default config;
