import type { Product, Variant } from "./types";

/** The product's sizes; an older product without any is one size made from its own fields. */
export function variantsOf(product: Product): Variant[] {
  if (product.variants?.length) return product.variants;
  return [{ id: "default", label: product.unit, price: product.price, compareAt: product.compareAt, inStock: product.inStock }];
}

/** The size a cart line points at. Lines saved before sizes existed have none and take the first. */
export function findVariant(product: Product, variantId?: string): Variant | undefined {
  const variants = variantsOf(product);
  return variantId ? variants.find((v) => v.id === variantId) : variants[0];
}

/** The size a shopper starts on: the cheapest one in stock, else the first. */
export function defaultVariant(product: Product): Variant {
  const variants = variantsOf(product);
  const inStock = variants.filter((v) => v.inStock);
  return (inStock.length ? inStock : variants).reduce((min, v) => (v.price < min.price ? v : min));
}

/** Whole-percent saving against the was price, or null without one. */
export const savingPercent = (variant: Variant) =>
  variant.compareAt && variant.compareAt > variant.price ? Math.round((1 - variant.price / variant.compareAt) * 100) : null;
