import type { MetadataRoute } from "next";

import { liveLangs, newestFirst, postCover } from "@/lib/blog";
import { getPosts, getProducts } from "@/lib/data";
import { absolute } from "@/lib/site";
import { type Lang, LANGS } from "@/lib/types";
import { photosOf } from "@/lib/variants";

/** Saving products or posts in the admin refreshes this with the storefront; the hour is a backstop. */
export const revalidate = 3600;

/**
 * Every page search should list, in each language it exists in, naming its other-language twin: the home page,
 * products with their photos, and the blog with its published posts (dated, so a change brings crawlers back).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [all, saved] = await Promise.all([getProducts(), getPosts()]);
  const products = all.filter((p) => p.active);
  const posts = newestFirst(saved.filter((p) => liveLangs(p).length > 0));
  const page = (path: (lang: Lang) => string, extra: { images?: string[]; lastModified?: string } = {}, langs: Lang[] = LANGS) =>
    langs.map((lang) => ({
      url: absolute(path(lang)),
      alternates: { languages: { ...Object.fromEntries(langs.map((l) => [l, absolute(path(l))])), "x-default": absolute(path(langs.includes("bn") ? "bn" : langs[0]!)) } },
      ...(extra.images?.length && { images: extra.images }),
      ...(extra.lastModified && { lastModified: extra.lastModified }),
    }));
  return [
    ...page((lang) => `/${lang}`),
    ...products.flatMap((p) => page((lang) => `/${lang}/p/${p.slug}`, { images: photosOf(p).map(absolute) })),
    ...page((lang) => `/${lang}/blog`, { lastModified: posts[0]?.published }),
    ...posts.flatMap((post) => {
      const cover = postCover(post, products);
      return page((lang) => `/${lang}/blog/${post.slug}`, { lastModified: post.updated ?? post.published, images: cover ? [absolute(cover)] : [] }, liveLangs(post));
    }),
  ];
}
