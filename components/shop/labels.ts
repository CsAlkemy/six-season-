import type { Dict } from "@/lib/i18n";

/** The words the shop's filters, sort and chips need, picked from the dictionary on the server. */
const KEYS = [
  "filters",
  "categories",
  "season",
  "price",
  "min",
  "max",
  "apply",
  "availability",
  "inStockOnly",
  "clearAll",
  "sortBy",
  "sortRelevance",
  "sortFeatured",
  "sortPriceAsc",
  "sortPriceDesc",
  "sortName",
  "oneProduct",
  "nProducts",
  "showProducts",
  "showOneProduct",
  "priceFrom",
  "priceUpTo",
  "close",
  "remove",
  "clearSearch",
] as const satisfies (keyof Dict)[];

export type ShopLabels = Pick<Dict, (typeof KEYS)[number]>;

export const shopLabels = (d: Dict) => Object.fromEntries(KEYS.map((key) => [key, d[key]])) as ShopLabels;
