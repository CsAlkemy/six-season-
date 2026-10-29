import { revalidatePath, unstable_cache, updateTag } from "next/cache";

import { readAllJson, readJson, writeJson } from "./blob";
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from "./defaults";
import type { Order, Product, Settings } from "./types";

const PRODUCTS = "data/products.json";
const SETTINGS = "data/settings.json";

/** Storefront pages are static; admin saves expire this tag. */
export const CATALOG_TAG = "catalog";

/** Fills sections and payment methods added after the settings were last saved. */
function withDefaults(saved: Partial<Settings> | null): Settings {
  const s = saved ?? {};
  return {
    store: { ...DEFAULT_SETTINGS.store, ...s.store },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...s.delivery },
    payments: {
      methods: DEFAULT_SETTINGS.payments.methods.map((method) => ({
        ...method,
        ...s.payments?.methods.find((m) => m.id === method.id),
      })),
    },
    home: {
      hero: { ...DEFAULT_SETTINGS.home.hero, ...s.home?.hero },
      sections: s.home?.sections ?? DEFAULT_SETTINGS.home.sections,
    },
  };
}

/** Storefront pages are static; expire them so a change shows on the next visit. Server actions only. */
export function refreshStorefront() {
  updateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

/** Fresh reads, for the admin and for pricing an order. */
export async function loadProducts(): Promise<Product[]> {
  return (await readJson<Product[]>(PRODUCTS)) ?? DEFAULT_PRODUCTS;
}

export async function loadSettings(): Promise<Settings> {
  return withDefaults(await readJson<Settings>(SETTINGS));
}

/** Cached reads for the storefront. */
export const getProducts = unstable_cache(loadProducts, ["products"], { tags: [CATALOG_TAG], revalidate: 3600 });
const cachedSettings = unstable_cache(loadSettings, ["settings"], { tags: [CATALOG_TAG], revalidate: 3600 });
/** The cache can hold settings saved before a section existed (it outlives a deploy), so fill the gaps on every read. */
export const getSettings = async () => withDefaults(await cachedSettings());

export const saveProducts = (products: Product[]) => writeJson(PRODUCTS, products);
export const saveSettings = (settings: Settings) => writeJson(SETTINGS, settings);

const orderPath = (id: string) => `orders/${id}.json`;

export const saveOrder = (order: Order) => writeJson(orderPath(order.id), order);
export const loadOrder = (id: string) => readJson<Order>(orderPath(id));

/** Newest first, a page at a time. */
export const listOrders = (cursor?: string) => readAllJson<Order>("orders/", 100, cursor);

/**
 * Every order, newest first, for the admin's search, counts and dashboard. One fetch per order, so this suits a
 * shop with hundreds of orders; past MAX it stops and the oldest drop out of the admin's lists.
 */
export async function loadAllOrders(max = 2000): Promise<Order[]> {
  const all: Order[] = [];
  let cursor: string | undefined;
  do {
    const page = await listOrders(cursor);
    all.push(...page.items);
    cursor = page.cursor;
  } while (cursor && all.length < max);
  return all;
}
