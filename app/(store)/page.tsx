import type { Metadata } from "next";
import Link from "next/link";

import { Faq } from "@/components/home/faq";
import { HomeHero } from "@/components/home/hero";
import { Testimonials } from "@/components/home/testimonials";
import { ArrowRightIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { PRODUCT_GRID, ProductCard } from "@/components/product-card";
import { getProducts, getSettings } from "@/lib/data";
import { t } from "@/lib/i18n";
import { alternates, homeSeo, openGraph } from "@/lib/site";
import { storeJsonLd } from "@/lib/structured-data";
import type { Product } from "@/lib/types";
import { STORE_LANG } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const lang = STORE_LANG;
  const { title, description } = homeSeo(lang, (await getSettings()).store.seo);
  return {
    title: { absolute: title },
    description,
    alternates: alternates(lang, () => "/"),
    openGraph: openGraph(lang, { url: "/", title, description }),
  };
}

/**
 * Motherhood's collection page: a title, one line about it, then the grid. The admin can switch on a hero above it
 * and add rows of hand-picked products (Settings › Home page); with neither, the page is just the grid. Under it, what
 * customers said (once the admin adds some), then the questions people ask before ordering, mostly answered from the
 * settings.
 */
export default async function Home() {
  const lang = STORE_LANG;
  const d = t(lang);
  const [all, settings] = await Promise.all([getProducts(), getSettings()]);
  const { home } = settings;
  const products = all.filter((p) => p.active);
  const byId = new Map(products.map((p) => [p.id, p]));
  const sections = home.sections
    .filter((s) => s.enabled)
    .map((s) => ({ ...s, products: s.productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)) }))
    .filter((s) => s.products.length > 0);
  const { hero } = home;
  const showHero = hero.enabled && hero.title[lang];
  // The page's first photo is its largest paint: the hero's (its photo or the first of its mosaic), or else the first card's.
  const firstCard = showHero ? null : (sections[0]?.products[0] ?? products[0])?.id;

  return (
    <>
      <JsonLd data={storeJsonLd(lang, settings)} />
      {showHero && <HomeHero lang={lang} settings={settings} products={products} />}

      <div className="container-page flex flex-col gap-12 pt-10 sm:gap-16 sm:pt-16">
        {/* Every page has one h1: the hero's, the heading over the grid below, or (curated sections and no hero) this one, for search and screen readers. */}
        {!showHero && sections.length > 0 && <h1 className="sr-only">{d.ourProducts}</h1>}
        {sections.map((section, i) => (
          <section key={section.id} id={`section-${i}`} className="flex scroll-mt-28 flex-col gap-6">
            <header className="flex max-w-180 flex-col gap-1">
              <h2 className="text-h3 sm:text-h2">{section.title[lang]}</h2>
              {section.subtitle[lang] && <p className="text-body-lg text-fg-secondary">{section.subtitle[lang]}</p>}
            </header>
            <div className={PRODUCT_GRID}>
              {section.products.map((product) => (
                <ProductCard key={product.id} product={product} lang={lang} priority={i === 0 && product.id === firstCard} />
              ))}
            </div>
          </section>
        ))}

        <section id="products" className="flex scroll-mt-28 flex-col gap-10">
          <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="flex max-w-180 flex-col gap-3">
              {sections.length > 0 || showHero ? <h2 className="text-h3 sm:text-h2">{d.allProducts}</h2> : <h1 className="text-h2 sm:text-h1">{d.ourProducts}</h1>}
              <p className="text-body-lg text-fg-secondary">{d.productsLead}</p>
            </div>
            {/* The shop: every product, with search, filters and sorting. */}
            <Link href="/shop" className="btn-secondary group/shop h-12 text-label-md">
              {d.shopAll}
              <ArrowRightIcon className="size-4 transition-transform group-hover/shop:translate-x-0.5" />
            </Link>
          </header>
          {/* Two cards across on phones, three on tablets, four on desktop; cards in a row share one height. */}
          <div className={PRODUCT_GRID}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} lang={lang} priority={!sections.length && product.id === firstCard} />
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-16 pt-16 sm:gap-24 sm:pt-24">
        <Testimonials lang={lang} settings={settings} />
        <Faq lang={lang} settings={settings} full />
      </div>
    </>
  );
}
