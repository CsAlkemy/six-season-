import type { Metadata } from "next";

import { STORE_NAME, t } from "./i18n";
import { LANGS, type Lang, type Settings } from "./types";

/**
 * The live store. Canonical links, the sitemap, structured data and share images all point here, so previews and
 * the bare domain (which redirects to www) never compete with it in search. SITE_URL overrides it, e.g. for a move.
 */
export const SITE_URL = (process.env.SITE_URL || "https://www.matirtaan.com.bd").replace(/\/+$/, "");

/** Absolute URL for a path on the store; full URLs (Blob photos) pass through. */
export const absolute = (path: string) => new URL(path, SITE_URL).toString();

const OG_LOCALE: Record<Lang, string> = { bn: "bn_BD", en: "en_US" };

/**
 * A page's canonical URL, and hreflang for each language it exists in (both, unless a post is written in only one),
 * with Bangla, or else the one language, for everyone else.
 */
export function alternates(lang: Lang, path: (lang: Lang) => string, langs: Lang[] = LANGS): Metadata["alternates"] {
  return {
    canonical: path(lang),
    languages: { ...Object.fromEntries(langs.map((l) => [l, path(l)])), "x-default": path(langs.includes("bn") ? "bn" : langs[0]!) },
  };
}

/**
 * Open Graph fields every storefront page shares. A page that sets openGraph replaces the layout's whole object,
 * so pages spread this in rather than lose the site name and locale. Images come from the opengraph-image routes.
 */
export const openGraph = (lang: Lang, page: { url: string; title?: string; description?: string }): Metadata["openGraph"] => ({
  type: "website",
  siteName: STORE_NAME[lang],
  locale: OG_LOCALE[lang],
  alternateLocale: LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
  ...page,
});

/** The home page's title and description: the admin's own, or the store name with its tagline and about line. */
export const homeSeo = (lang: Lang, seo: Settings["store"]["seo"]) => ({
  title: seo.title[lang] || `${STORE_NAME[lang]} · ${t(lang).tagline}`,
  description: seo.description[lang] || t(lang).about,
});

/** "01712345678" or "8801712345678" → "+8801712345678"; anything else is left as typed. */
export function intlPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
  return phone.trim();
}

/** What wa.me wants: digits with the country code first, no "+" and no leading 0. "01712345678", "+880 1712-345678" and "8801712345678" all give "8801712345678". */
export function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (/^01\d{9}$/.test(digits)) return `88${digits}`;
  if (/^1\d{9}$/.test(digits)) return `880${digits}`;
  return digits;
}

/** Cuts text for a meta description at a word, near Google's ~155-character snippet. */
export function snippet(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : max).replace(/[\s,.;:–—-]+$/, "")}…`;
}
