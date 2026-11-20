import type { Metadata } from "next";

import { FeaturedReview } from "@/components/home/featured-review";
import { Faq } from "@/components/home/faq";
import { HomeHero, TrustStrip } from "@/components/home/hero";
import { ProductTiles } from "@/components/home/product-tiles";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { getProducts, getSettings } from "@/lib/data";
import { t } from "@/lib/i18n";
import { alternates, homeSeo, openGraph } from "@/lib/site";
import { storeJsonLd } from "@/lib/structured-data";
import type { Lang, Product } from "@/lib/types";
import { langOf } from "@/lib/lang";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const lang = langOf((await params).lang);
  const { title, description } = homeSeo(lang, (await getSettings()).store.seo);
  return {
    title: { absolute: title },
    description,
    alternates: alternates(lang, (to) => `/${to}`),
    openGraph: openGraph(lang, { url: `/${lang}`, title, description }),
  };
}

/**
 * The home page, top to bottom, each part there to help someone choose and order:
 * - the hero (Settings › Home page): the headline, the store's checklist of reasons, one button to the products, and
 *   the facts of ordering, beside a photo (or the products' own photos);
 * - a band of what every order comes with, only what the settings make true;
 * - any hand-picked rows the admin added;
 * - every product as a coloured tile with its price on the button, one tap to the cart;
 * - one real customer's review, when the owner has added one;
 * - the questions people ask before ordering, mostly answered from the settings, and the way back to the products.
 */
export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = langOf((await params).lang);
  const d = t(lang);
  const [all, settings] = await Promise.all([getProducts(), getSettings()]);
  const { home } = settings;
  const products = all.filter((p) => p.active);
  const byId = new Map(products.map((p) => [p.id, p]));
  const sections = home.sections
    .filter((s) => s.enabled)
    .map((s) => ({ ...s, products: s.productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)) }))
    .filter((s) => s.products.length > 0);
  const showHero = home.hero.enabled && Boolean(home.hero.title[lang]);
  // Without a hero, the first hand-picked card is the page's largest paint, so it's fetched first.
  const firstCard = showHero ? null : sections[0]?.products[0]?.id;

  return (
    <>
      <JsonLd data={storeJsonLd(lang, settings)} />
      {showHero && <HomeHero lang={lang} settings={settings} products={products} target={sections.length ? "section-0" : "products"} />}
      <TrustStrip lang={lang} settings={settings} />

      {sections.length > 0 && (
        <div className="container-page flex flex-col gap-12 pt-12 sm:gap-16 sm:pt-16">
          {/* Every page has one h1: the hero's, the heading over the products below, or (hand-picked rows and no hero) this one. */}
          {!showHero && <h1 className="sr-only">{d.ourProducts}</h1>}
          {sections.map((section, i) => (
            <section key={section.id} id={`section-${i}`} className="flex scroll-mt-28 flex-col gap-6">
              <header className="flex max-w-180 flex-col gap-1">
                <h2 className="text-h3 sm:text-h2">{section.title[lang]}</h2>
                {section.subtitle[lang] && <p className="text-body-lg text-fg-secondary">{section.subtitle[lang]}</p>}
              </header>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-8">
                {section.products.map((product) => (
                  <ProductCard key={product.id} product={product} lang={lang} priority={i === 0 && product.id === firstCard} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section id="products" className="flex scroll-mt-24 flex-col gap-8 pt-12 sm:gap-10 sm:pt-16">
        <header className="container-page flex flex-col gap-3">
          {sections.length > 0 || showHero ? <h2 className="text-h3 sm:text-h2">{d.allProducts}</h2> : <h1 className="text-h2 sm:text-h1">{d.ourProducts}</h1>}
          <p className="max-w-180 text-body-lg text-fg-secondary">{d.productsLead}</p>
        </header>
        <ProductTiles products={products} lang={lang} eagerFirst={!showHero && !sections.length} />
      </section>

      {home.review.enabled && (
        <div className="container-page pt-16 sm:pt-24">
          <FeaturedReview lang={lang} settings={settings} products={products} />
        </div>
      )}

      <div className="pt-16 sm:pt-24">
        <Faq lang={lang} settings={settings} full />
      </div>
    </>
  );
}
