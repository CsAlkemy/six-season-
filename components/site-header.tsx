import Link from "next/link";

import { shopCategories } from "@/lib/categories";
import { getProducts } from "@/lib/data";
import { t } from "@/lib/i18n";
import { searchItems } from "@/lib/shop";
import type { Lang } from "@/lib/types";

import { CartButton } from "./cart-button";
import { UserIcon } from "./icons";
import { SeasonPicker } from "./season-picker";
import { SiteSearch } from "./site-search";

/**
 * Motherhood's header: logo left and round buttons right, frosted over the season's sky. Search comes first: it's
 * on every page and lands on the shop. It reads the (cached) catalogue itself for its suggestions.
 */
export async function SiteHeader({ lang }: { lang: Lang }) {
  const d = t(lang);
  const products = await getProducts();
  return (
    <header className="season-header sticky top-0 z-30 border-b">
      <div className="container-page flex h-18 items-center justify-between gap-4 lg:h-22">
        <Link href={"/"} aria-label="Matir Taan">
          <img
            src="/logo.svg"
            alt="Matir Taan"
            width={66}
            height={44}
            className="h-12 w-auto lg:h-14"
          />
        </Link>
        <nav className="flex items-center gap-1">
          <SiteSearch
            items={searchItems(products)}
            categories={shopCategories(products).map((c) => ({ slug: c.slug, name: c.name[lang] }))}
            lang={lang}
            labels={{
              search: d.search,
              searchProducts: d.searchProducts,
              clearSearch: d.clearSearch,
              close: d.close,
              seeAllResults: d.seeAllResults,
              noMatchesFor: d.noMatchesFor,
              browseAll: d.browseAll,
              categories: d.categories,
              allProducts: d.allProducts,
              priceFrom: d.priceFrom,
              outOfStock: d.outOfStock,
            }}
          />
          <SeasonPicker labels={{ season: d.season, auto: d.seasonAuto, today: d.today, animation: d.animation }} />
          <Link
            href={`/account`}
            aria-label={d.account}
            className="grid size-12 place-items-center rounded-full transition-colors hover:bg-muted hover:text-fg-brand"
          >
            <UserIcon className="size-6" />
          </Link>
          <CartButton href={`/cart`} label={d.cart} />
        </nav>
      </div>
    </header>
  );
}
