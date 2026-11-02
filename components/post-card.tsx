import Link from "next/link";

import { type Post, postDate, postDescription, readingMinutes } from "@/lib/blog";
import { blurOf } from "@/lib/blur";
import { blurStyle } from "@/lib/blur-style";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

import { LeafIcon } from "./icons";
import { TONE } from "./product-media";

/** A post's picture (its banner, or its product's photo) over that photo's blur; a leaf on green without one. */
export async function PostCover({ src, alt = "", className = "", priority = false }: { src?: string; alt?: string; className?: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className={`flex w-full items-center justify-center ${TONE.leaf} ${className}`} aria-hidden>
        <LeafIcon className="size-12" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      style={blurStyle(await blurOf(src))}
      className={`w-full bg-muted object-cover ${className}`}
    />
  );
}

/** "২ নভেম্বর ২০২৬ · ৪ মিনিটে পড়ুন". */
export function PostMeta({ post, lang }: { post: Post; lang: Lang }) {
  const minutes = readingMinutes(post.text[lang].html).toLocaleString(lang === "bn" ? "bn-BD" : "en");
  return (
    <p className="text-caption text-fg-tertiary">
      <time dateTime={post.published}>{postDate(post.published, lang)}</time> · {t(lang).minRead.replace("{n}", minutes)}
    </p>
  );
}

/** A post in a list: the cover, date and reading time, title and description. The title carries the link. */
export function PostCard({ post, cover, lang, heading: Heading = "h2", priority = false }: { post: Post; cover?: string; lang: Lang; heading?: "h2" | "h3"; priority?: boolean }) {
  const href = `/${lang}/blog/${post.slug}`;
  return (
    <article className="group flex flex-col gap-4">
      {/* The mouse target; keyboards and screen readers use the title's link. */}
      <Link href={href} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-xl bg-muted">
        <PostCover src={cover} priority={priority} className="aspect-[3/2] transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-col gap-2">
        <PostMeta post={post} lang={lang} />
        <Heading className="text-h4 leading-snug font-semibold">
          <Link href={href} className="transition-colors hover:text-fg-brand">
            {post.text[lang].title}
          </Link>
        </Heading>
        <p className="line-clamp-3 text-body-md text-fg-secondary">{postDescription(post, lang)}</p>
      </div>
    </article>
  );
}
