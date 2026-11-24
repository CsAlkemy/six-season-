import { categoryOf, shopCategories } from "./categories";
import { matchScore, type SearchDoc, type SearchItem, searchTerms } from "./search";
import { SHOP_PAGE_SIZE, type ShopQuery, sortOf } from "./shop-query";
import { type Lang, type Product, type Season, SEASONS } from "./types";
import { defaultVariant, photosOf, variantsOf } from "./variants";

/** What a product is found by (lib/search.ts). */
export function searchDocOf(product: Product): SearchDoc {
  const category = categoryOf(product);
  return {
    name: product.name,
    category: category?.name,
    tagline: product.tagline,
    slugs: category ? [product.slug, category.slug] : [product.slug],
  };
}

/** The products on show, as the header's search box needs them. */
export const searchItems = (products: Product[]): SearchItem[] =>
  products
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      doc: searchDocOf(p),
      image: photosOf(p)[0] ?? null,
      price: defaultVariant(p).price,
      many: variantsOf(p).length > 1,
      inStock: variantsOf(p).some((v) => v.inStock),
    }));

export interface ShopFacets {
  /** The categories with something to buy, each with how many products it would show. */
  categories: { slug: string; name: string; count: number }[];
  /** The seasons any product is at its best in. */
  seasons: { id: Season; count: number }[];
  /** How many of the products shown are in stock. */
  inStock: number;
  /** The cheapest and dearest size on sale, for the price boxes' hints. */
  price: { min: number; max: number } | null;
}

export interface ShopPage {
  /** This page's products. */
  products: Product[];
  /** Products matching, on every page. */
  total: number;
  page: number;
  pages: number;
  facets: ShopFacets;
}

type Facet = "category" | "season" | "price" | "stock";

const inStock = (p: Product) => variantsOf(p).some((v) => v.inStock);

/**
 * The shop for a query: the products matching it, in its order, a page at a time, and for each filter how many
 * products each choice would show. Choices within a filter add up (ghee or mustard oil) and filters narrow each other
 * (ghee, in stock), so a choice's count is worked out with every other filter on but its own off.
 */
export function browse(all: Product[], query: ShopQuery, lang: Lang): ShopPage {
  const products = all.filter((p) => p.active);
  const terms = searchTerms(query.q);
  const scores = new Map(terms.length ? products.map((p) => [p.id, matchScore(terms, searchDocOf(p))]) : []);

  const passes = (p: Product, skip?: Facet) =>
    (!terms.length || (scores.get(p.id) ?? 0) > 0) &&
    (skip === "category" || !query.categories.length || query.categories.includes(categoryOf(p)?.slug ?? "")) &&
    (skip === "season" || !query.seasons.length || (p.seasons ?? []).some((s) => query.seasons.includes(s))) &&
    (skip === "price" ||
      (query.min === null && query.max === null) ||
      variantsOf(p).some((v) => (query.min === null || v.price >= query.min) && (query.max === null || v.price <= query.max))) &&
    (skip === "stock" || !query.inStock || inStock(p));

  const matching = products.filter((p) => passes(p));
  const price = (p: Product) => defaultVariant(p).price;
  const sorted = [...matching];
  switch (sortOf(query)) {
    case "relevance":
      sorted.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
      break;
    case "price-asc":
      sorted.sort((a, b) => price(a) - price(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => price(b) - price(a));
      break;
    case "name":
      sorted.sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang));
      break;
    // "featured": the store's own order, as the admin keeps it.
  }

  const pages = Math.max(1, Math.ceil(sorted.length / SHOP_PAGE_SIZE));
  const page = Math.min(query.page, pages);

  const countWithout = (skip: Facet, has: (p: Product) => boolean) => products.filter((p) => passes(p, skip) && has(p)).length;
  const prices = products.flatMap((p) => variantsOf(p).map((v) => v.price));

  return {
    products: sorted.slice((page - 1) * SHOP_PAGE_SIZE, page * SHOP_PAGE_SIZE),
    total: sorted.length,
    page,
    pages,
    facets: {
      categories: shopCategories(products).map((c) => ({
        slug: c.slug,
        name: c.name[lang],
        count: countWithout("category", (p) => categoryOf(p)?.id === c.id),
      })),
      seasons: SEASONS.filter((s) => products.some((p) => p.seasons?.includes(s))).map((id) => ({
        id,
        count: countWithout("season", (p) => Boolean(p.seasons?.includes(id))),
      })),
      inStock: countWithout("stock", inStock),
      price: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    },
  };
}
