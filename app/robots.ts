import type { MetadataRoute } from "next";

import { absolute, SITE_URL } from "@/lib/site";

/**
 * Everything but the admin is open to crawlers. Cart and account stay crawlable so search engines can read their
 * noindex; a Disallow would hide it and could leave them listed without a description.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL,
  };
}
