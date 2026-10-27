import Link from "next/link";

import { t, taka } from "@/lib/i18n";
import type { Lang, Product } from "@/lib/types";

import { CardActions } from "./add-to-cart";
import { ProductMedia } from "./product-media";

/** Momcozy's card: one soft panel, the photo across its top, a bold name, the price, then Add to cart and Buy now. */
export function ProductCard({ product, lang }: { product: Product; lang: Lang }) {
  const d = t(lang);
  const href = `/${lang}/p/${product.slug}`;
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-muted">
      <div className="relative aspect-square overflow-hidden">
        {/* The title carries the link for keyboards and screen readers; this is the mouse target. */}
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
          <ProductMedia product={product} lang={lang} className={`h-full ${product.inStock ? "" : "opacity-60"}`} />
        </Link>
        {!product.inStock && (
          <span className="absolute top-3 left-3 rounded-full bg-surface px-3 py-1 text-caption font-semibold text-fg-secondary">{d.outOfStock}</span>
        )}
      </div>

      <div className="@container flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="line-clamp-2 text-h4 leading-snug font-semibold">
          <Link href={href} className="transition-colors hover:text-fg-brand">
            {product.name[lang]}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-display text-h4 font-bold">{taka(product.price, lang)}</span>
          {product.compareAt && <s className="text-body-md text-fg-tertiary">{taka(product.compareAt, lang)}</s>}
          <span className="text-body-sm text-fg-tertiary">/ {product.unit[lang]}</span>
        </p>
        {product.inStock && (
          <div className="mt-auto pt-3">
            <CardActions id={product.id} cartHref={`/${lang}/cart`} label={d.addShort} addedLabel={d.added} buyLabel={d.buyNow} />
          </div>
        )}
      </div>
    </article>
  );
}
