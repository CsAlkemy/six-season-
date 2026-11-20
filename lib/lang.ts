import { notFound } from "next/navigation";

import { type Lang, STORE_LANG, STORE_LANGS } from "./types";

/**
 * The address's language, or a 404 for any other first segment (/xyz, /xyz/c/ghee). Every store page starts with it:
 * reading words and posts in a language that doesn't exist ended in a server error instead of the 404.
 */
export function langOf(raw: string): Lang {
  if (!STORE_LANGS.includes(raw as Lang)) notFound();
  return raw as Lang;
}

/**
 * For the store layout only: the address's language, or the store's for any other. The layout doesn't 404 itself (it owns
 * <html>, so nothing could show a 404 around it and visitors got a bare black page); every page under it calls
 * langOf and 404s, and app/[lang]/not-found.tsx shows that inside the store's header and footer.
 */
export const shellLang = (raw: string): Lang => (STORE_LANGS.includes(raw as Lang) ? (raw as Lang) : STORE_LANG);
