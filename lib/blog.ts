import { snippet } from "./site";
import { LANGS, type Lang, type Product } from "./types";
import { photosOf } from "./variants";

/** One language's version of a post. The body is HTML from the admin's editor, cleaned on save (lib/post-html.ts). */
export interface PostText {
  title: string;
  /** For Google's snippet and the blog's list; empty uses the start of the text. */
  description: string;
  html: string;
}

/**
 * A post on মাটির কথা, the store's blog. Written in the admin (Blog), saved with the catalogue in the Blob store;
 * the four in content/blog/ show until the first save. Both languages share one URL slug.
 */
export interface Post {
  id: string;
  /** The URL: /bn/blog/<slug> and /en/blog/<slug>. Latin, so links stay readable when shared. */
  slug: string;
  /** YYYY-MM-DD: the day it was first published. */
  published: string;
  /** YYYY-MM-DD: the last day its text changed after it was published. */
  updated?: string;
  /** On the blog when true; a draft only the admin sees when false. */
  active: boolean;
  /** The banner: atop the post, on its card and in its share image. Without one, its first product's photo stands in. */
  image: string | null;
  /** Ids of the products it's about: their cards follow it. */
  products: string[];
  /** A language with no title or text isn't published in that language. */
  text: Record<Lang, PostText>;
}

/** Whether readers of `lang` see the post: published, and written in that language. */
export const isLive = (post: Post, lang: Lang) => post.active && Boolean(post.text[lang].title.trim() && htmlText(post.text[lang].html));

/** The languages a post is live in, for hreflang and the sitemap. */
export const liveLangs = (post: Post): Lang[] => LANGS.filter((lang) => isLive(post, lang));

export const newestFirst = (posts: Post[]): Post[] => [...posts].sort((a, b) => b.published.localeCompare(a.published));

/** The products a post names that the store still shows, in its order. */
export const postProducts = (post: Post, products: Product[]): Product[] =>
  post.products.flatMap((id) => products.find((p) => p.id === id && p.active) ?? []);

/** The post's picture: its banner, or the first photo of a product it's about. */
export const postCover = (post: Post, products: Product[]): string | undefined =>
  post.image ?? postProducts(post, products).flatMap(photosOf)[0];

/** A photo uploaded to the store (its Blob store, or the dev folder): the only kind a post's text may show. */
export const isOwnPhoto = (src: string) => /^(https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/|\/(local-uploads|images)\/)/.test(src);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/** The words of a post's HTML, for reading time and a description when none was written. */
export const htmlText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e]!)
    .replace(/\s+/g, " ")
    .trim();

/** What Google and the blog's list show: the written description, or the start of the text. */
export const postDescription = (post: Post, lang: Lang) => post.text[lang].description.trim() || snippet(htmlText(post.text[lang].html));

/** Minutes to read at about 200 words a minute; Bangla and English words both split on spaces. */
export const readingMinutes = (html: string) => Math.max(1, Math.round(htmlText(html).split(" ").filter(Boolean).length / 200));

/** Today in Bangladesh, YYYY-MM-DD. */
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

/** "২ নভেম্বর ২০২৬" / "2 November 2026". */
export const postDate = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(
    new Date(`${date}T00:00:00+06:00`),
  );
