import type { Text } from "./types";

/**
 * Product search, the same on the server (the shop's ?q=) and in the browser (the header's suggestions), so the
 * suggestions never disagree with the shop's results. A product matches when every word typed is in its English or
 * Bangla name, its category, its one-line tagline or its address (which carries the romanised name: "khejur-gur").
 * Descriptions are left out: one passing mention would bring up products nobody was looking for.
 */
export interface SearchDoc {
  name: Text;
  category?: Text;
  tagline?: Text;
  /** The product's and its category's addresses. */
  slugs: string[];
}

/** A product as the header's search box needs it: what to match, and enough to show it as a suggestion. */
export interface SearchItem {
  id: string;
  slug: string;
  doc: SearchDoc;
  image: string | null;
  /** The card's price: the cheapest size in stock. */
  price: number;
  /** Several sizes: the price reads "From ৳…". */
  many: boolean;
  inStock: boolean;
}

/**
 * Lowercase, Latin accents dropped, punctuation and hyphens as spaces, joiners removed. Bangla vowel signs are marks
 * too, so only the Latin accent block is stripped. NFKD splits ড় and ো the same way whichever way they were typed.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ​-‍﻿]/g, "")
    .toLowerCase()
    .replace(/[\s\-_/\\,.;:!?'"“”‘’()[\]{}।॥&+]+/g, " ")
    .trim();
}

/** The words of a query, each once. */
export const searchTerms = (query: string): string[] => [...new Set(normalize(query).split(" ").filter(Boolean))];

const FIELDS = [
  ["name", 8],
  ["category", 4],
  ["tagline", 2],
] as const;

/**
 * How well a product matches: 0 when any word is missing, more the better. A word in the name counts most, and a word
 * that starts one of the product's words (ghee → "Ghee") counts double one found inside another ("oil" in "boil").
 * A single letter only matches the start of a word, so typing "g" suggests Ghee and Gur, not every product with a g.
 */
export function matchScore(terms: string[], doc: SearchDoc): number {
  if (!terms.length) return 0;
  // A leading space, so " term" finds a match at the start of any word, the first included.
  const fields: [string, number][] = [];
  for (const [key, weight] of FIELDS) {
    const text = doc[key];
    if (text) fields.push([` ${normalize(text.en)} ${normalize(text.bn)}`, weight]);
  }
  fields.push([` ${normalize(doc.slugs.join(" "))}`, 2]);

  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const [text, weight] of fields) {
      if (text.includes(` ${term}`)) best = Math.max(best, weight * 2);
      else if (term.length > 1 && text.includes(term)) best = Math.max(best, weight);
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}
