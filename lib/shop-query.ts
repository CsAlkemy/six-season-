import { SEASONS, type Season } from "./types";

/**
 * What the shop is showing, as its address says: /shop?q=ghee&category=mustard-oil&season=sheet&min=200&max=1500
 * &stock=in&sort=price-asc&page=2. The header's search lands here with ?q=, and every filter is in the address, so a
 * filtered shop can be shared, bookmarked and stepped back through. Shared by the page (server) and its filters
 * (browser); nothing here knows the products.
 */
export const SHOP_PATH = "/shop";

/** Products on a page of the shop: fills whole rows of two, three or four cards. */
export const SHOP_PAGE_SIZE = 24;

/** "relevance" only means something with a search; it's the order then, and the store's own order otherwise. */
export const SORTS = ["relevance", "featured", "price-asc", "price-desc", "name"] as const;
export type Sort = (typeof SORTS)[number];

export interface ShopQuery {
  /** What was searched for; "" for none. */
  q: string;
  /** Category slugs (lib/categories.ts); a product in any of them is shown. */
  categories: string[];
  /** A product at its best in any of these is shown. */
  seasons: Season[];
  /** Taka; a product with any size in the range is shown. */
  min: number | null;
  max: number | null;
  /** Only products with a size in stock. */
  inStock: boolean;
  /** As chosen; null is the default order (see sortOf). */
  sort: Sort | null;
  page: number;
}

export const EMPTY_QUERY: ShopQuery = { q: "", categories: [], seasons: [], min: null, max: null, inStock: false, sort: null, page: 1 };

/** The order products are in when none is chosen: best match first for a search, the store's own order otherwise. */
export const defaultSort = (q: string): Sort => (q ? "relevance" : "featured");

/** The order the shop is in. Relevance without a search falls back to the store's order. */
export const sortOf = (query: ShopQuery): Sort => (query.sort === "relevance" && !query.q ? "featured" : (query.sort ?? defaultSort(query.q)));

/** "১২০০" or "1,200" → 1200; Bangla digits count, decimals are dropped, anything else is null. */
export function parseTaka(value: string): number | null {
  const digits = value
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .split(".")[0]!
    .replace(/\D/g, "");
  if (!digits) return null;
  return Math.min(Number(digits), 10_000_000);
}

type Params = Record<string, string | string[] | undefined>;

const all = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []).flatMap((v) => v.split(","));
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** The shop's address read leniently: unknown words are dropped, a range given backwards is turned round. */
export function parseShopQuery(params: Params): ShopQuery {
  let min = parseTaka(one(params.min));
  let max = parseTaka(one(params.max));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const sort = one(params.sort);
  const page = Number.parseInt(one(params.page), 10);
  return {
    q: one(params.q).trim().slice(0, 100),
    categories: [...new Set(all(params.category).map((s) => s.trim()).filter(Boolean))],
    seasons: SEASONS.filter((s) => all(params.season).includes(s)),
    min,
    max,
    inStock: one(params.stock) === "in",
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : null,
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 1000) : 1,
  };
}

/** The shop's address for a query, leaving out whatever is at its default. */
export function shopHref(query: Partial<ShopQuery>): string {
  const { q, categories, seasons, min, max, inStock, sort, page } = { ...EMPTY_QUERY, ...query };
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  categories.forEach((c) => params.append("category", c));
  seasons.forEach((s) => params.append("season", s));
  if (min !== null) params.set("min", String(min));
  if (max !== null) params.set("max", String(max));
  if (inStock) params.set("stock", "in");
  if (sort && sort !== defaultSort(q.trim())) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${SHOP_PATH}?${search}` : SHOP_PATH;
}

/** How many filters are on (a price range is one); the search isn't a filter. */
export const filterCount = (query: ShopQuery) =>
  query.categories.length + query.seasons.length + (query.min !== null || query.max !== null ? 1 : 0) + (query.inStock ? 1 : 0);

/** The same search and order with every filter off. */
export const withoutFilters = (query: ShopQuery): ShopQuery => ({ ...EMPTY_QUERY, q: query.q, sort: query.sort });
