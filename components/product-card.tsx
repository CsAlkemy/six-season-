import Link from "next/link";

import { type Dict, t, taka } from "@/lib/i18n";
import type { Lang, Product } from "@/lib/types";
import { defaultVariant, variantsOf } from "@/lib/variants";

import { CardActions } from "./add-to-cart";
import { SeasonIcon } from "./icons";
import { ProductMedia } from "./product-media";

/** "৳৪৮০ থেকে" / "From ৳480". */
const fromPrice = (amount: number, lang: Lang, d: Dict) => (lang === "bn" ? `${taka(amount, lang)} ${d.from}` : `${d.from} ${taka(amount, lang)}`);

/**
 * Momcozy's card: one soft panel, the photo across its top, a bold name and the price. One size buys
 * straight from here; with several the card shows the lowest price and sends the shopper to pick one.
 * The panel takes the season's colours, and the badge and highlight follow whichever season <html> shows.
 */
export function ProductCard({ product, lang }: { product: Product; lang: Lang }) {
  const d = t(lang);
  const href = `/${lang}/p/${product.slug}`;
  const variants = variantsOf(product);
  const sizes = variants.length;
  const variant = defaultVariant(product);
  const inStock = variants.some((v) => v.inStock);

  return (
    <article data-in-season={product.seasons?.join(" ")} className="season-card group flex flex-col overflow-hidden rounded-xl">
      <div className="relative aspect-square overflow-hidden">
        {/* The title carries the link for keyboards and screen readers; this is the mouse target. */}
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
          <ProductMedia product={product} lang={lang} className={`h-full ${inStock ? "" : "opacity-60"}`} />
        </Link>
        {!inStock ? (
          <span className="absolute top-3 left-3 rounded-full bg-surface px-3 py-1 text-caption font-semibold text-fg-secondary">{d.outOfStock}</span>
        ) : (
          product.seasons?.map((season) => (
            <span
              key={season}
              data-season-only={season}
              className="season-badge absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold shadow-sm"
            >
              <SeasonIcon season={season} className="size-3.5" />
              {d.inSeason}
            </span>
          ))
        )}
      </div>

      <div className="season-card-body @container flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="line-clamp-2 pr-10 text-h4 leading-snug font-semibold">
          <Link href={href} className="transition-colors hover:text-fg-brand">
            {product.name[lang]}
          </Link>
        </h3>
        {sizes > 1 ? (
          <p className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-display text-h4 font-bold">{fromPrice(variant.price, lang, d)}</span>
            <span className="font-display text-body-md font-medium text-fg-secondary">
              · {sizes.toLocaleString(lang === "bn" ? "bn-BD" : "en")} {d.sizes}
            </span>
          </p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-display text-h4 font-bold">{taka(variant.price, lang)}</span>
            {variant.compareAt && <s className="text-body-md text-fg-tertiary">{taka(variant.compareAt, lang)}</s>}
            {/* Baloo draws Bangla digits (১, ২…) larger than Hind, so pack sizes stay readable. */}
            <span className="font-display text-body-md font-medium text-fg-secondary">/ {variant.label[lang]}</span>
          </p>
        )}
        {inStock && (
          <div className="mt-auto pt-3">
            {sizes > 1 ? (
              <Link href={href} className="btn-primary h-12 w-full text-label-md">
                {d.chooseSize}
              </Link>
            ) : (
              <CardActions id={product.id} variant={variant.id} cartHref={`/${lang}/cart`} label={d.addShort} addedLabel={d.added} buyLabel={d.buyNow} />
            )}
          </div>
        )}
      </div>
    </article>
  );
}
