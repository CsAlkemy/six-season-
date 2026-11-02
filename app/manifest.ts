import type { MetadataRoute } from "next";

import { STORE_NAME, t } from "@/lib/i18n";

/** For "Add to Home screen" on phones: the store's name, sprout icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${STORE_NAME.bn} · ${STORE_NAME.en}`,
    short_name: STORE_NAME.bn,
    description: t("bn").about,
    lang: "bn",
    start_url: "/bn",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#168456",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
