import Link from "next/link";

import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

import { CartButton } from "./cart-button";
import { UserIcon } from "./icons";
import { SeasonPicker } from "./season-picker";

/** The links in the middle of the header on wide screens: the products, the questions, who we are, an order's whereabouts. */
const NAV = "rounded-full px-4 py-2.5 text-label transition-colors hover:bg-muted hover:text-fg-brand";

/** Motherhood's header: logo left and round buttons right, frosted over the season's sky; the store's pages between on wide screens. */
export function SiteHeader({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <header className="season-header sticky top-0 z-30 border-b">
      <div className="container-page flex h-18 items-center justify-between gap-4 lg:h-22">
        <Link href={`/${lang}`} aria-label="Matir Taan">
          <img
            src="/logo.svg"
            alt="Matir Taan"
            width={66}
            height={44}
            className="h-12 w-auto lg:h-14"
          />
        </Link>
        <nav aria-label={d.navShop} className="hidden items-center gap-1 lg:flex">
          <Link href={`/${lang}#products`} className={NAV}>{d.navShop}</Link>
          <Link href={`/${lang}#faq`} className={NAV}>{d.navFaq}</Link>
          <Link href={`/${lang}/about`} className={NAV}>{d.aboutUs}</Link>
          <Link href={`/${lang}/track`} className={NAV}>{d.trackOrder}</Link>
        </nav>
        <nav className="flex items-center gap-1">
          <SeasonPicker lang={lang} labels={{ season: d.season, auto: d.seasonAuto, today: d.today, animation: d.animation }} />
          <Link
            href={`/${lang}/account`}
            aria-label={d.account}
            className="grid size-12 place-items-center rounded-full transition-colors hover:bg-muted hover:text-fg-brand"
          >
            <UserIcon className="size-6" />
          </Link>
          <CartButton href={`/${lang}/cart`} label={d.cart} />
        </nav>
      </div>
    </header>
  );
}
