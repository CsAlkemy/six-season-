import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/post-card";
import { isLive, newestFirst, postCover } from "@/lib/blog";
import { getPosts, getProducts } from "@/lib/data";
import { STORE_NAME, t } from "@/lib/i18n";
import { alternates, openGraph } from "@/lib/site";
import { blogJsonLd } from "@/lib/structured-data";
import type { Lang } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[lang]/blog">): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  const d = t(lang);
  return {
    title: d.blog,
    description: d.blogLead,
    alternates: alternates(lang, (to) => `/${to}/blog`),
    openGraph: openGraph(lang, { url: `/${lang}/blog`, title: `${d.blog} · ${STORE_NAME[lang]}`, description: d.blogLead }),
  };
}

/** মাটির কথা: the posts published in this language, newest first, each with its banner or product photo. */
export default async function BlogPage({ params }: PageProps<"/[lang]/blog">) {
  const lang = (await params).lang as Lang;
  const d = t(lang);
  const [all, products] = await Promise.all([getPosts(), getProducts()]);
  const posts = newestFirst(all.filter((p) => isLive(p, lang)));

  return (
    <div className="container-page flex flex-col gap-10 pt-8 sm:pt-12">
      <JsonLd data={blogJsonLd(lang, posts)} />
      <header className="flex max-w-180 flex-col gap-3">
        <h1 className="text-h2 sm:text-h1">{d.blog}</h1>
        <p className="text-body-lg text-fg-secondary">{d.blogLead}</p>
      </header>
      <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} cover={postCover(post, products)} lang={lang} priority={i === 0} />
        ))}
      </div>
    </div>
  );
}
