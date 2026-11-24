import type { Metadata } from "next";
import Link from "next/link";

import { SearchIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { shopLabels } from "@/components/shop/labels";
import { Pagination } from "@/components/shop/pagination";
import { ShopFilters } from "@/components/shop/shop-filters";
import { ShopProvider, ShopResults } from "@/components/shop/shop-provider";
import { ShopToolbar } from "@/components/shop/shop-toolbar";
import { findCategory } from "@/lib/categories";
import { getProducts } from "@/lib/data";
import { STORE_NAME, t } from "@/lib/i18n";
import { browse } from "@/lib/shop";
import { filterCount, parseShopQuery, SHOP_PATH, shopHref, sortOf, withoutFilters } from "@/lib/shop-query";
import { openGraph } from "@/lib/site";
import { shopJsonLd } from "@/lib/structured-data";
import { STORE_LANG } from "@/lib/types";

/** Beside the filters there's room for three cards across a wide screen; two on a phone, three on a tablet. */
const SHOP_GRID = "shop-grid grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 xl:gap-8";

/** The address read as a query, with categories the store doesn't have left out. */
async function readQuery(searchParams: PageProps<"/shop">["searchParams"]) {
  const query = parseShopQuery(await searchParams);
  return { ...query, categories: query.categories.filter((slug) => findCategory(slug)) };
}

/**
 * The shop, unfiltered, is the page search engines list; page 2 on is its own page. A search or a filter is the same
 * products narrowed down, so it points back to the shop and stays out of the index (its links are still followed).
 */
export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const lang = STORE_LANG;
  const d = t(lang);
  const query = await readQuery(searchParams);
  const narrowed = Boolean(query.q || filterCount(query) || query.sort);
  const canonical = !narrowed && query.page > 1 ? shopHref({ page: query.page }) : SHOP_PATH;
  const title = query.q ? d.resultsFor.replace("{q}", query.q) : d.shop;
  return {
    title,
    description: d.about,
    alternates: { canonical },
    ...(narrowed && { robots: { index: false, follow: true } }),
    openGraph: openGraph(lang, { url: SHOP_PATH, title: `${d.shop} · ${STORE_NAME[lang]}`, description: d.about }),
  };
}

/**
 * Every product the store has on show, with filters on the left (a drawer on a phone) and the cards on the right,
 * a page of SHOP_PAGE_SIZE at a time. The header's search lands here (?q=). The products are worked out on the
 * server from the address (lib/shop.ts), so a search or a filtered view opens ready, can be shared, and Back undoes
 * a filter; changing one fetches the new list without reloading the page.
 */
export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const lang = STORE_LANG;
  const d = t(lang);
  const [all, query] = await Promise.all([getProducts(), readQuery(searchParams)]);
  const { products, total, page, pages, facets } = browse(all, query, lang);
  const sort = sortOf(query);

  return (
    <div className="container-page pt-8 sm:pt-12">
      <JsonLd data={shopJsonLd(products, lang)} />
      <header className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
            <li>
              <Link href={"/"} className="transition-colors hover:text-fg-primary">
                {STORE_NAME[lang]}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{d.shop}</li>
          </ol>
        </nav>
        <h1 className="text-h2 break-words sm:text-h1">{query.q ? d.resultsFor.replace("{q}", query.q) : d.shop}</h1>
      </header>

      <ShopProvider query={{ ...query, page }} lang={lang} labels={shopLabels(d)}>
        <div className="mt-8 grid items-start gap-10 sm:mt-10 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-14">
          {/* Beside the products from 1024px, staying in view as they scroll; on a phone the toolbar's Filters opens them. Taller than the window, they scroll on their own, faded at the edge instead of a scroll bar. */}
          <aside aria-label={d.filters} className="scroll-fade-y sticky top-28 -m-1 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain p-1 lg:top-32 lg:block">
            <ShopFilters facets={facets} heading />
          </aside>

          <div className="flex min-w-0 flex-col gap-6">
            <ShopToolbar total={total} facets={facets} />
            <ShopResults>
              {products.length > 0 ? (
                // In the store's order, what's in season leads (globals.css); an order the shopper picked keeps its places.
                <div className={SHOP_GRID} data-sorted={sort === "featured" ? undefined : ""}>
                  {products.map((product, i) => (
                    <ProductCard key={product.id} product={product} lang={lang} priority={page === 1 && i < 2} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-[1.75rem] border border-border bg-surface/80 px-6 py-16 text-center">
                  <SearchIcon className="size-10 text-fg-tertiary" />
                  <h2 className="mt-4 text-h4">{d.noResults}</h2>
                  <p className="mt-2 max-w-md text-body-md text-fg-secondary">
                    {query.q && `${d.noMatchesFor.replace("{q}", query.q)} `}
                    {d.noResultsBody}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {filterCount(query) > 0 && (
                      <Link href={shopHref(withoutFilters(query))} className="btn-secondary h-12 text-label-md">
                        {d.clearFilters}
                      </Link>
                    )}
                    <Link href={SHOP_PATH} className="btn-primary h-12 text-label-md">
                      {d.browseAll}
                    </Link>
                  </div>
                </div>
              )}
              <Pagination query={query} page={page} pages={pages} lang={lang} d={d} />
            </ShopResults>
          </div>
        </div>
      </ShopProvider>
    </div>
  );
}
