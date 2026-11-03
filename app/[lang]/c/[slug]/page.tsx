import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/post-card";
import { ProductCard } from "@/components/product-card";
import { isLive, newestFirst, postCover } from "@/lib/blog";
import { CATEGORIES, findCategory, productsIn } from "@/lib/categories";
import { getPosts, getProducts } from "@/lib/data";
import { STORE_NAME, t } from "@/lib/i18n";
import { alternates, openGraph } from "@/lib/site";
import { categoryJsonLd } from "@/lib/structured-data";
import type { Lang } from "@/lib/types";

export const revalidate = 3600;
export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: PageProps<"/[lang]/c/[slug]">): Promise<Metadata> {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const category = findCategory(slug);
  if (!category) return {};
  const path = (to: Lang) => `/${to}/c/${category.slug}`;
  return {
    title: category.title[lang],
    description: category.description[lang],
    alternates: alternates(lang, path),
    openGraph: openGraph(lang, { url: path(lang), title: `${category.title[lang]} · ${STORE_NAME[lang]}`, description: category.description[lang] }),
  };
}

/** A kind of product as a page: what it is, the products of that kind, and the posts about them. A category with nothing to buy is a 404. */
export default async function CategoryPage({ params }: PageProps<"/[lang]/c/[slug]">) {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const category = findCategory(slug);
  if (!category) notFound();
  const [all, posts] = await Promise.all([getProducts(), getPosts()]);
  const products = productsIn(category, all);
  if (!products.length) notFound();
  const d = t(lang);
  const ids = new Set(products.map((p) => p.id));
  const guides = newestFirst(posts.filter((post) => isLive(post, lang) && post.products.some((id) => ids.has(id)))).slice(0, 3);

  return (
    <div className="container-page flex flex-col gap-12 pt-8 sm:gap-16 sm:pt-12">
      <JsonLd data={categoryJsonLd(category, products, lang)} />
      <header className="flex max-w-180 flex-col gap-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
            <li>
              <Link href={`/${lang}`} className="transition-colors hover:text-fg-primary">
                {STORE_NAME[lang]}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{category.name[lang]}</li>
          </ol>
        </nav>
        <h1 className="text-h2 sm:text-h1">{category.name[lang]}</h1>
        {category.intro[lang].map((paragraph) => (
          <p key={paragraph} className="text-body-lg text-fg-secondary">
            {paragraph}
          </p>
        ))}
      </header>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-8">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} lang={lang} priority={i === 0} />
        ))}
      </div>

      {guides.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="text-h3 sm:text-h2">{d.morePosts}</h2>
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {guides.map((post) => (
              <PostCard key={post.id} post={post} cover={postCover(post, all)} lang={lang} heading="h3" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
