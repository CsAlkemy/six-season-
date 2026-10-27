import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { ProductMedia } from "@/components/product-media";
import { getProducts } from "@/lib/data";
import { STORE_NAME, t, taka } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/** Products added later render on first visit, then stay static. */
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await getProducts()).filter((p) => p.active).map((p) => ({ slug: p.slug }));
}

async function find(slug: string) {
  return (await getProducts()).find((p) => p.slug === slug && p.active);
}

export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const product = await find(slug);
  if (!product) return {};
  const l = lang as Lang;
  return {
    title: product.name[l],
    description: product.description[l],
    openGraph: product.image ? { images: [product.image] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const product = await find(slug);
  if (!product) notFound();
  const d = t(lang);

  return (
    <div className="container-page flex flex-col gap-4 sm:gap-6 sm:pt-5">
      <nav aria-label="Breadcrumb" className="max-sm:hidden">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
          <li>
            <Link href={`/${lang}`} className="transition-colors hover:text-fg-primary">
              {STORE_NAME[lang]}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">{product.name[lang]}</li>
        </ol>
      </nav>

      {/* Motherhood's columns: the photo a little wider than the buy box. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        {/* Phones: edge-to-edge photo. */}
        <div className="-mx-4 overflow-hidden bg-muted sm:mx-0 sm:rounded-xl">
          <ProductMedia product={product} lang={lang} className={product.inStock ? "" : "opacity-55"} />
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-2">
            <p className="text-caption text-fg-secondary">{product.unit[lang]}</p>
            <h1 className="text-h2 lg:text-h1">{product.name[lang]}</h1>
          </div>
          <p className="flex items-baseline gap-2.5">
            <span className="font-display text-h2 text-fg-brand">{taka(product.price, lang)}</span>
            {product.compareAt && <s className="text-body-lg text-fg-tertiary">{taka(product.compareAt, lang)}</s>}
          </p>
          <p className="border-t border-border pt-5 text-body-lg whitespace-pre-line text-fg-secondary">{product.description[lang]}</p>
          {product.inStock ? (
            <AddToCart id={product.id} label={d.addToCart} addedLabel={d.added} withQty />
          ) : (
            <p className="btn w-full bg-muted text-fg-tertiary">{d.outOfStock}</p>
          )}
        </div>
      </div>
    </div>
  );
}
