import type { MetadataRoute } from "next";

import { PAGE_SLUGS } from "@/content/pages";
import { liveLangs, newestFirst, postCover } from "@/lib/blog";
import { shopCategories } from "@/lib/categories";
import { getPosts, getProducts } from "@/lib/data";
import { absolute } from "@/lib/site";
import { type Lang, STORE_LANGS } from "@/lib/types";
import { photosOf } from "@/lib/variants";

/** Saving products or posts in the admin refreshes this with the storefront; the hour is a backstop. */
export const revalidate = 3600;

/**
 * Every page search should list, in each language it exists in, naming its other-language twin: the home page,
 * the categories that have something to buy, products with their photos, the store's own pages (about, contact,
 * delivery, returns, privacy), and the blog with its published posts (dated, so a change brings crawlers back).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [all, saved] = await Promise.all([getProducts(), getPosts()]);
  const products = all.filter((p) => p.active);
  // Only the store's language: a post written only in Bangla isn't on the store.
  const shown = (post: (typeof saved)[number]) => liveLangs(post).filter((l) => STORE_LANGS.includes(l));
  const posts = newestFirst(saved.filter((p) => shown(p).length > 0));
  const page = (path: (lang: Lang) => string, extra: { images?: string[]; lastModified?: string } = {}, langs: Lang[] = STORE_LANGS) =>
    langs.map((lang) => ({
      url: absolute(path(lang)),
      ...(extra.images?.length && { images: extra.images }),
      ...(extra.lastModified && { lastModified: extra.lastModified }),
    }));
  return [
    ...page((lang) => "/"),
    ...page((lang) => "/shop"),
    ...shopCategories(all).flatMap((c) => page((lang) => `/c/${c.slug}`)),
    ...products.flatMap((p) => page((lang) => `/p/${p.slug}`, { images: photosOf(p).map(absolute) })),
    ...PAGE_SLUGS.flatMap((slug) => page((lang) => `/${slug}`)),
    ...page((lang) => `/blog`, { lastModified: posts[0]?.published }),
    ...posts.flatMap((post) => {
      const cover = postCover(post, products);
      return page((lang) => `/blog/${post.slug}`, { lastModified: post.updated ?? post.published, images: cover ? [absolute(cover)] : [] }, shown(post));
    }),
  ];
}
