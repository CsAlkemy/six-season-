import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { blurOf } from "@/lib/blur";
import { blurStyle } from "@/lib/blur-style";
import { getProducts, getSettings } from "@/lib/data";
import { t } from "@/lib/i18n";
import { alternates, homeSeo, openGraph } from "@/lib/site";
import { storeJsonLd } from "@/lib/structured-data";
import type { Lang, Product } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  const { title, description } = homeSeo(lang, (await getSettings()).store.seo);
  return {
    title: { absolute: title },
    description,
    alternates: alternates(lang, (to) => `/${to}`),
    openGraph: openGraph(lang, { url: `/${lang}`, title, description }),
  };
}

/**
 * Motherhood's collection page: a title, one line about it, then the grid. The admin can switch on a hero above it
 * and add rows of hand-picked products (Settings › Home page); with neither, the page is just the grid.
 */
export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = (await params).lang as Lang;
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
  const heroBlur = showHero && hero.image ? await blurOf(hero.image) : null;

  // The page's first photo is its largest paint: the hero's, or else the first card's.
  const firstCard = showHero && hero.image ? null : (sections[0]?.products[0] ?? products[0])?.id;

  return (
    <>
      <JsonLd data={storeJsonLd(lang, settings)} />
      {showHero && (
        <section className="container-page pt-6 sm:pt-8">
          <div className="relative isolate flex min-h-72 items-end overflow-hidden rounded-xl bg-footer text-fg-footer sm:min-h-96">
            {hero.image && <img src={hero.image} alt="" fetchPriority="high" style={blurStyle(heroBlur)} className="absolute inset-0 -z-20 size-full object-cover" />}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <div className="flex max-w-3xl flex-col items-start gap-4 p-6 sm:p-12">
              <h1 className="text-h2 sm:text-h1">{hero.title[lang]}</h1>
              {hero.subtitle[lang] && <p className="text-body-lg opacity-90">{hero.subtitle[lang]}</p>}
              {hero.cta[lang] && (
                <a href={sections.length ? "#section-0" : "#products"} className="btn bg-surface text-fg-primary hover:bg-brand-soft">
                  {hero.cta[lang]}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="container-page flex flex-col gap-12 pt-10 sm:gap-16 sm:pt-16">
        {/* Every page has one h1: the hero's, the heading over the grid below, or (curated sections and no hero) this one, for search and screen readers. */}
        {!showHero && sections.length > 0 && <h1 className="sr-only">{d.ourProducts}</h1>}
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

        <section id="products" className="flex scroll-mt-28 flex-col gap-10">
          <header className="flex max-w-180 flex-col gap-3">
            {sections.length > 0 || showHero ? <h2 className="text-h3 sm:text-h2">{d.allProducts}</h2> : <h1 className="text-h2 sm:text-h1">{d.ourProducts}</h1>}
            <p className="text-body-lg text-fg-secondary">{d.productsLead}</p>
          </header>
          {/* One card per row on phones, two then three on tablets, four on desktop; cards in a row share one height. */}
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} lang={lang} priority={!sections.length && product.id === firstCard} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
