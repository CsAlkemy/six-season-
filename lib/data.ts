import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { DEFAULT_POSTS } from "@/content/blog";

import { readAllJson, readJson, writeJson } from "./blob";
import type { Post } from "./blog";
import { withBlur } from "./blur";
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from "./defaults";
import { kindOf } from "./payments";
import type { Order, PaymentMethod, Product, Settings } from "./types";

const PRODUCTS = "data/products.json";
const SETTINGS = "data/settings.json";
const POSTS = "data/posts.json";

/** Storefront pages are static; admin saves expire this tag. */
export const CATALOG_TAG = "catalog";

/**
 * Fills sections and payment fields added after the settings were last saved. The admin's payment methods keep
 * their own order; only cash on delivery is always there, and the starter set shows until something is saved.
 */
function withDefaults(saved: Partial<Settings> | null): Settings {
  const s = saved ?? {};
  const defaults = DEFAULT_SETTINGS.payments.methods;
  const list = s.payments?.methods?.length ? s.payments.methods : defaults;
  const methods = (list.some((m) => m.id === "cod") ? list : [defaults[0]!, ...list]).map((method) => {
    const fallback = DEFAULT_SETTINGS.payments.methods.find((d) => d.id === method.id);
    return { ...fallback, ...method, kind: kindOf(method), name: method.name ?? fallback?.name ?? { bn: method.id, en: method.id } } as PaymentMethod;
  });
  return {
    store: {
      ...DEFAULT_SETTINGS.store,
      ...s.store,
      social: { ...DEFAULT_SETTINGS.store.social, ...s.store?.social },
      seo: { ...DEFAULT_SETTINGS.store.seo, ...s.store?.seo },
    },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...s.delivery },
    payments: { methods },
    returns: { ...DEFAULT_SETTINGS.returns, ...s.returns },
    home: {
      hero: { ...DEFAULT_SETTINGS.home.hero, ...s.home?.hero },
      sections: s.home?.sections ?? DEFAULT_SETTINGS.home.sections,
    },
  };
}

/**
 * Storefront pages are static; expire them so a change shows on the next visit. `{ expire: 0 }` means the next
 * request waits for fresh data instead of being served the old copy once (updateTag is for fetch and "use cache"
 * data; the catalogue sits in unstable_cache, which revalidateTag clears).
 */
export function refreshStorefront() {
  revalidateTag(CATALOG_TAG, { expire: 0 });
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
const cachedProducts = unstable_cache(loadProducts, ["products"], { tags: [CATALOG_TAG], revalidate: 3600 });
/** Each photo's placeholder has its own cache entry (lib/blur.ts), so a catalogue refresh only renders new photos. */
export const getProducts = async () => withBlur(await cachedProducts());
const cachedSettings = unstable_cache(loadSettings, ["settings"], { tags: [CATALOG_TAG], revalidate: 3600 });
/** The cache can hold settings saved before a section existed (it outlives a deploy), so fill the gaps on every read. */
export const getSettings = async () => withDefaults(await cachedSettings());

/** A product the storefront shows, by its slug. */
export async function findProduct(slug: string): Promise<Product | undefined> {
  const match = (list: Product[]) => list.find((p) => p.slug === slug && p.active);
  // A product added a moment ago may not be in the cached list yet, and a 404 here would be cached for that URL,
  // so before giving up look at the catalogue itself.
  return match(await getProducts()) ?? match(await loadProducts());
}

export const saveProducts = (products: Product[]) => writeJson(PRODUCTS, products);
export const saveSettings = (settings: Settings) => writeJson(SETTINGS, settings);

/** The blog's posts, drafts included: the admin's, or the first ones in content/blog/ until it saves any. */
export async function loadPosts(): Promise<Post[]> {
  return (await readJson<Post[]>(POSTS)) ?? DEFAULT_POSTS;
}

/** Cached for the storefront; saving a post expires it with the rest of the catalogue. */
export const getPosts = unstable_cache(loadPosts, ["posts"], { tags: [CATALOG_TAG], revalidate: 3600 });

/** A post by its slug, drafts included (the page decides what to show), with the same fresh look as findProduct. */
export async function findPost(slug: string): Promise<Post | undefined> {
  const match = (list: Post[]) => list.find((p) => p.slug === slug);
  return match(await getPosts()) ?? match(await loadPosts());
}

export const savePosts = (posts: Post[]) => writeJson(POSTS, posts);

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
