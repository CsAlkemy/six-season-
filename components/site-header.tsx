import Link from "next/link";

import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

import { CartButton } from "./cart-button";
import { UserIcon } from "./icons";
import { SeasonPicker } from "./season-picker";

/** Motherhood's header: logo left and round buttons right, frosted over the season's sky. */
export function SiteHeader({ lang }: { lang: Lang }) {
  const d = t(lang);
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
