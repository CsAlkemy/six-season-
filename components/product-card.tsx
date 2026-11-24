import Link from "next/link";

import { fromPrice, t, taka } from "@/lib/i18n";
import type { Lang, Product } from "@/lib/types";
import { defaultVariant, itemId, savingPercent, variantsOf } from "@/lib/variants";

import { CardActions } from "./add-to-cart";
import { BanglaName } from "./bangla-name";
import { ArrowRightIcon, SeasonIcon } from "./icons";
import { ProductMedia } from "./product-media";

/** The grid product cards sit in: two across on a phone, three on a tablet, four on a wide screen. */
export const PRODUCT_GRID = "grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-8";

/**
 * A product as a soft card in the season's colours: the photo set inside it with rounded corners, the name (and its
 * Bangla name), the price, and what to do next. One size buys straight from here; with several, the card shows the
 * lowest price and the sizes there are, and sends the shopper to pick one. What's in season wears the season's
 * badge and accent (globals.css, .season-card), whichever season <html> shows.
 */
export function ProductCard({ product, lang, priority = false }: { product: Product; lang: Lang; priority?: boolean }) {
  const d = t(lang);
  const href = `/p/${product.slug}`;
  const variants = variantsOf(product);
  const many = variants.length > 1;
  const variant = defaultVariant(product);
  const inStock = variants.some((v) => v.inStock);
  const saving = many ? null : savingPercent(variant);

  return (
    <article data-in-season={product.seasons?.join(" ")} className="season-card group flex flex-col rounded-[1.75rem] p-1.5 sm:p-2">
      <div className="relative aspect-square overflow-hidden rounded-[1.375rem] sm:rounded-[1.25rem]">
        {/* The title carries the link for keyboards and screen readers; this is the mouse target. */}
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.05]">
          <ProductMedia product={product} lang={lang} priority={priority} className={`h-full ${inStock ? "" : "opacity-60 grayscale-[40%]"}`} />
        </Link>
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          {!inStock ? (
            <span className="rounded-full bg-surface/90 px-2.5 py-1 text-caption font-semibold text-fg-secondary backdrop-blur-sm sm:px-3">{d.outOfStock}</span>
          ) : (
            <span>
              {product.seasons?.map((season) => (
                <span key={season} data-season-only={season} className="season-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold shadow-card sm:px-3">
                  <SeasonIcon season={season} className="size-3.5" />
                  {d.inSeason}
                </span>
              ))}
            </span>
          )}
          {inStock && saving && (
            <span className="rounded-full bg-fg-primary px-2.5 py-1 text-caption font-semibold text-fg-inverse sm:px-3">
              {lang === "bn" ? `${saving.toLocaleString("bn-BD")}% ${d.off}` : `${d.off} ${saving}%`}
            </span>
          )}
        </div>
      </div>

      <div className="@container flex flex-1 flex-col gap-3 px-2 pt-3 pb-2 sm:gap-4 sm:px-3 sm:pt-4 sm:pb-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="line-clamp-2 text-body-md leading-snug font-semibold sm:text-body-lg sm:leading-snug">
            <Link href={href} className="transition-colors hover:text-fg-brand">
              {product.name[lang]}
            </Link>
          </h3>
          <BanglaName name={product.name} lang={lang} className="text-body-sm text-fg-secondary" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-h4 leading-none font-bold">{many ? fromPrice(variant.price, lang) : taka(variant.price, lang)}</span>
            {!many && variant.compareAt && <s className="text-body-sm text-fg-tertiary">{taka(variant.compareAt, lang)}</s>}
            {!many && <span className="font-display text-body-sm font-medium text-fg-secondary">/ {variant.label[lang]}</span>}
          </p>
          {many && (
            <ul aria-label={d.sizes} className="flex flex-wrap gap-1.5">
              {variants.map((v) => (
                <li key={v.id} className={`season-chip rounded-full px-2.5 py-0.5 font-display text-caption font-medium ${v.inStock ? "" : "text-fg-tertiary line-through"}`}>
                  {v.label[lang]}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto">
          {!inStock ? (
            <p className="flex h-11 items-center justify-center rounded-full bg-muted text-label-md text-fg-tertiary sm:h-12">{d.outOfStock}</p>
          ) : many ? (
            <Link href={href} className="btn-primary group/size h-11 w-full gap-2 px-3 text-label-md sm:h-12 sm:px-4">
              {d.chooseSize}
              {/* Only where there's room beside the words: two cards across on a phone have none. */}
              <ArrowRightIcon className="hidden size-4 shrink-0 transition-transform group-hover/size:translate-x-0.5 @[11rem]:block" />
            </Link>
          ) : (
            <CardActions
              id={product.id}
              variant={variant.id}
              item={{ id: itemId(product, variant), name: product.name[lang], variant: variant.label[lang], price: variant.price }}
              cartHref={`/cart`}
              label={d.addShort}
              addedLabel={d.added}
              buyLabel={d.buyNow}
              card
            />
          )}
        </div>
      </div>
    </article>
  );
}
