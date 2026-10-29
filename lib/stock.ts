import type { OrderItem, Product, Variant } from "./types";
import { variantsOf } from "./variants";

/** A size with a count is in stock while it has units; one without (older saves) keeps its in/out switch. */
export const withStock = (variant: Variant, stock: number): Variant => ({ ...variant, stock, inStock: stock > 0 });

/** Units across every counted size, or null when none are counted. */
export function totalStock(product: Product): number | null {
  const counted = variantsOf(product).filter((v) => v.stock !== undefined);
  return counted.length ? counted.reduce((sum, v) => sum + (v.stock ?? 0), 0) : null;
}

export const DEFAULT_LOW_STOCK = 5;

/** Sizes at or under the product's alert level, still counted. */
export const lowVariants = (product: Product) =>
  variantsOf(product).filter((v) => v.stock !== undefined && v.stock <= (product.lowStockAt ?? DEFAULT_LOW_STOCK));

/**
 * Moves units for an order's lines: -1 takes them at checkout, +1 puts them back when it's cancelled. Returns the
 * new list and the lines there weren't enough of. Lines for deleted products or uncounted sizes pass through untouched.
 */
export function moveStock(products: Product[], items: OrderItem[], sign: 1 | -1) {
  const qty = new Map<string, number>();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId ?? "default"}`;
    qty.set(key, (qty.get(key) ?? 0) + item.qty);
  }
  const short: string[] = [];
  const next = products.map((product) => {
    if (!product.variants?.length) return product;
    let changed = false;
    const variants = product.variants.map((variant) => {
      const n = qty.get(`${product.id}:${variant.id}`);
      if (!n || variant.stock === undefined) return variant;
      const stock = variant.stock + sign * n;
      if (stock < 0) short.push(`${product.name.en} (${variant.label.en})`);
      changed = true;
      return withStock(variant, Math.max(0, stock));
    });
    return changed ? summarize({ ...product, variants }) : product;
  });
  return { products: next, short };
}

/**
 * Fills the product's own price, unit and stock fields from its sizes: the cheapest in stock (else the cheapest)
 * leads, as the storefront card and older code read those fields.
 */
export function summarize(product: Product): Product {
  const variants = product.variants ?? [];
  if (!variants.length) return product;
  const pool = variants.some((v) => v.inStock) ? variants.filter((v) => v.inStock) : variants;
  const lead = pool.reduce((min, v) => (v.price < min.price ? v : min));
  return { ...product, price: lead.price, compareAt: lead.compareAt, unit: lead.label, inStock: variants.some((v) => v.inStock) };
}
