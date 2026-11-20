import type { Product, Variant } from "./types";

/** The product's sizes; an older product without any is one size made from its own fields. */
export function variantsOf(product: Product): Variant[] {
  if (product.variants?.length) return product.variants;
  return [{ id: "default", label: product.unit, price: product.price, compareAt: product.compareAt, inStock: product.inStock }];
}

/** The product's photos, cover first; an older product has only its cover. */
export const photosOf = (product: Product): string[] => (product.images?.length ? product.images : product.image ? [product.image] : []);

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

/**
 * One size's ID wherever it's counted: the Google feed's g:id, the product data's sku, and the item ID analytics and
 * the Pixel send. One ID in all three is what lets ads and remarketing match a visit to the product.
 */
export const itemId = (product: Pick<Product, "id">, variant: Pick<Variant, "id">) => `${product.id}-${variant.id}`;

/** The query that opens a product page on one size: `/p/ghee?size=v-eb76ba`. Google links each size this way. */
export const SIZE_PARAM = "size";

/** The size an address asks for (`?size=`), when the product has it. */
export function askedVariant(product: Product, search: string): Variant | undefined {
  const id = new URLSearchParams(search).get(SIZE_PARAM);
  return id ? variantsOf(product).find((v) => v.id === id) : undefined;
}

/** Whole-percent saving against the was price, or null without one. */
export const savingPercent = (variant: Variant) =>
  variant.compareAt && variant.compareAt > variant.price ? Math.round((1 - variant.price / variant.compareAt) * 100) : null;
