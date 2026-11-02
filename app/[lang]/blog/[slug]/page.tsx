import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { PostCard, PostCover, PostMeta } from "@/components/post-card";
import { ProductCard } from "@/components/product-card";
import { isLive, liveLangs, newestFirst, postCover, postDescription, postProducts } from "@/lib/blog";
import { findPost, getPosts, getProducts } from "@/lib/data";
import { STORE_NAME, t } from "@/lib/i18n";
import { alternates, openGraph } from "@/lib/site";
import { postJsonLd } from "@/lib/structured-data";
import type { Lang } from "@/lib/types";

export const revalidate = 3600;
/** Posts published after the last build render on first visit, then stay static. */
export const dynamicParams = true;

export async function generateStaticParams({ params }: { params: { lang: string } }) {
  return (await getPosts()).filter((p) => isLive(p, params.lang as Lang)).map((p) => ({ slug: p.slug }));
}

/** The post, if readers of this language should see it: drafts and posts not written in it are a 404. */
async function find(slug: string, lang: Lang) {
  const post = await findPost(slug);
  return post && isLive(post, lang) ? post : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const post = await find(slug, lang);
  if (!post) return {};
  const title = post.text[lang].title;
  const description = postDescription(post, lang);
  const path = (to: Lang) => `/${to}/blog/${post.slug}`;
  return {
    title,
    description,
    alternates: alternates(lang, path, liveLangs(post)),
    openGraph: {
      ...openGraph(lang, { url: path(lang), title: `${title} · ${STORE_NAME[lang]}`, description }),
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
    },
  };
}

/** A post: the banner and text in a reading column, then the products it's about (to buy right there) and other posts. */
export default async function PostPage({ params }: PageProps<"/[lang]/blog/[slug]">) {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const post = await find(slug, lang);
  if (!post) notFound();
  const d = t(lang);
  const [posts, all] = await Promise.all([getPosts(), getProducts()]);
  const products = postProducts(post, all);
  const cover = postCover(post, all);
  const others = newestFirst(posts.filter((p) => p.id !== post.id && isLive(p, lang))).slice(0, 3);

  return (
    <div className="container-page flex flex-col gap-16 pt-8 sm:gap-20 sm:pt-12">
      <JsonLd data={postJsonLd(post, lang, products, cover)} />
      <article>
        <header className="mx-auto flex max-w-180 flex-col gap-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
              <li>
                <Link href={`/${lang}`} className="transition-colors hover:text-fg-primary">
                  {STORE_NAME[lang]}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/${lang}/blog`} className="transition-colors hover:text-fg-primary">
                  {d.blog}
                </Link>
              </li>
            </ol>
          </nav>
          <h1 className="text-h2 sm:text-h1">{post.text[lang].title}</h1>
          {post.text[lang].description && <p className="text-body-lg text-fg-secondary">{post.text[lang].description}</p>}
          <PostMeta post={post} lang={lang} />
        </header>
        {cover && (
          <div className="mx-auto mt-8 max-w-240 overflow-hidden rounded-xl bg-muted sm:mt-10">
            <PostCover src={cover} alt={post.image ? post.text[lang].title : (products[0]?.name[lang] ?? "")} priority className="aspect-[16/9]" />
          </div>
        )}
        {/* Cleaned when it was saved (lib/post-html.ts). */}
        <div className="post-body mx-auto mt-8 max-w-180 sm:mt-10" dangerouslySetInnerHTML={{ __html: post.text[lang].html }} />
      </article>

      {products.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="text-h3 sm:text-h2">{d.inThisPost}</h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="text-h3 sm:text-h2">{d.morePosts}</h2>
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {others.map((other) => (
              <PostCard key={other.id} post={other} cover={postCover(other, all)} lang={lang} heading="h3" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
