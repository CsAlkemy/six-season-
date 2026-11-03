import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { PAGE_SLUGS, PAGES } from "@/content/pages";
import { getProducts, getSettings } from "@/lib/data";
import { STORE_NAME } from "@/lib/i18n";
import { alternates, openGraph } from "@/lib/site";
import { pageJsonLd } from "@/lib/structured-data";
import type { Lang } from "@/lib/types";

export const revalidate = 3600;
/** Only the store's own pages (content/pages.tsx); anything else under /bn or /en is a 404. */
export const dynamicParams = false;
export const generateStaticParams = () => PAGE_SLUGS.map((page) => ({ page }));

const find = (slug: string) => PAGE_SLUGS.find((s) => s === slug);

export async function generateMetadata({ params }: PageProps<"/[lang]/[page]">): Promise<Metadata> {
  const { lang: l, page: slug } = await params;
  const lang = l as Lang;
  const key = find(slug);
  if (!key) return {};
  const { title, description } = PAGES[key];
  const path = (to: Lang) => `/${to}/${key}`;
  return {
    title: title[lang],
    description: description[lang],
    alternates: alternates(lang, path),
    openGraph: openGraph(lang, { url: path(lang), title: `${title[lang]} · ${STORE_NAME[lang]}`, description: description[lang] }),
  };
}

/** About, contact, delivery and privacy: a heading and text in the blog's reading column. */
export default async function InfoPage({ params }: PageProps<"/[lang]/[page]">) {
  const { lang: l, page: slug } = await params;
  const lang = l as Lang;
  const key = find(slug);
  if (!key) notFound();
  const page = PAGES[key];
  const [settings, products] = await Promise.all([getSettings(), getProducts()]);

  return (
    <div className="container-page flex flex-col gap-16 pt-8 sm:pt-12">
      <JsonLd data={pageJsonLd(page.schema, key, page.title[lang], page.description[lang], lang)} />
      <article className="mx-auto w-full max-w-180">
        <header className="flex flex-col gap-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
              <li>
                <Link href={`/${lang}`} className="transition-colors hover:text-fg-primary">
                  {STORE_NAME[lang]}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page">{page.title[lang]}</li>
            </ol>
          </nav>
          <h1 className="text-h2 sm:text-h1">{page.title[lang]}</h1>
        </header>
        <div className="post-body mt-8 sm:mt-10">{page.body[lang]({ lang, settings, products })}</div>
      </article>
    </div>
  );
}
