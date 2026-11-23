import type { Metadata } from "next";

import "../globals.css";
import { Analytics } from "@/components/analytics";
import { CartDrawer, type CartLabels, type CartProduct } from "@/components/cart-drawer";
import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SeasonScene } from "@/components/season-scene";
import { SiteHeader } from "@/components/site-header";
import { shopCategories } from "@/lib/categories";
import { getProducts, getSettings } from "@/lib/data";
import { fontVars } from "@/lib/fonts";
import { STORE_NAME, t } from "@/lib/i18n";
import { SEASON_SCRIPT, seasonAt } from "@/lib/season";
import { openGraph, SITE_URL } from "@/lib/site";
import { type Lang, type Product, STORE_LANG } from "@/lib/types";
import { photosOf, variantsOf } from "@/lib/variants";


/**
 * What every storefront page starts from. Canonical links and hreflang are set by each page that search should
 * list (home, products); cart and account opt out of search. Share images come from the opengraph-image routes.
 */
export async function generateMetadata(): Promise<Metadata> {
  const lang = STORE_LANG;
  const d = t(lang);
  const google = process.env.GOOGLE_SITE_VERIFICATION;
  const bing = process.env.BING_SITE_VERIFICATION;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${STORE_NAME[lang]} · ${d.tagline}`, template: `%s · ${STORE_NAME[lang]}` },
    description: d.about,
    applicationName: STORE_NAME[lang],
    openGraph: openGraph(lang, { url: "/" }),
    twitter: { card: "summary_large_image" },
    verification: { google, other: bing ? { "msvalidate.01": bing } : undefined },
  };
}

/** The cart drawer's few fields of each product on show: no descriptions or photo placeholders on every page. */
const cartProducts = (products: Product[]): CartProduct[] =>
  products.filter((p) => p.active).map((p) => ({ id: p.id, slug: p.slug, name: p.name, image: photosOf(p)[0], variants: variantsOf(p) }));

function cartLabels(lang: Lang): CartLabels {
  const d = t(lang);
  return {
    yourCart: d.yourCart,
    close: d.close,
    each: d.each,
    remove: d.remove,
    subtotal: d.subtotal,
    deliveryAtCheckout: d.deliveryAtCheckout,
    checkout: d.checkout,
    continueShopping: d.continueShopping,
    emptyCart: d.emptyCart,
    cartUnavailable: d.cartUnavailable,
  };
}

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const lang = STORE_LANG;
  const [settings, products] = await Promise.all([getSettings(), getProducts()]);

  return (
    // The head script sets the visitor's season and data-motion before paint (no JS: today's season, still); the DOM wins on hydration.
    // data-scroll-behavior: with smooth scrolling on <html>, Next 16 only jumps to the top of a new page, rather than gliding there over it, when told to.
    <html lang={lang} className={fontVars} data-season={seasonAt(Date.now())} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* text/plain on the client: React warns about rendering scripts, and <html> already holds the result. */}
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: SEASON_SCRIPT }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SeasonScene />
        <CartProvider firstSize={Object.fromEntries(products.map((p) => [p.id, variantsOf(p)[0]!.id]))}>
          <SiteHeader lang={lang} />
          <main className="flex-1">{children}</main>
          <SiteFooter lang={lang} settings={settings} categories={shopCategories(products)} />
          <CartDrawer lang={lang} products={cartProducts(products)} labels={cartLabels(lang)} />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
