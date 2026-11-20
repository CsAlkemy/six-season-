import Link from "next/link";

import { fromPrice, t, taka } from "@/lib/i18n";
import { sized } from "@/lib/photo-sizes";
import type { Lang, Product } from "@/lib/types";
import { defaultVariant, itemId, savingPercent, variantsOf } from "@/lib/variants";

import { BanglaName } from "../bangla-name";
import { LeafIcon } from "../icons";
import { TileBuy } from "./tile-buy";

/**
 * The products as a row of coloured tiles across the page, each in its own colour (the product's tone): photo,
 * name, one line about it (its tagline, else its sizes) and a button that says the price. One size: the button
 * puts it in the cart and opens the cart. Several: it opens the product page to pick one.
 */
export function ProductTiles({ products, lang, eagerFirst = false }: { products: Product[]; lang: Lang; eagerFirst?: boolean }) {
  const d = t(lang);
  return (
    <ul className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
      {products.map((product, i) => {
        const variants = variantsOf(product);
        const variant = defaultVariant(product);
        const inStock = variants.some((v) => v.inStock);
        const href = `/${lang}/p/${product.slug}`;
        const line = product.tagline?.[lang] || variants.map((v) => v.label[lang]).join(" · ");
        const saving = savingPercent(variant);
        const price = variants.length > 1 ? fromPrice(variant.price, lang) : taka(variant.price, lang);
        return (
          <li key={product.id} className={`tile tile-${product.tone} flex flex-col items-center gap-3 px-3 py-8 text-center sm:px-6 sm:py-10`}>
            <Link href={href} className="relative block w-[78%] max-w-60 transition-transform duration-300 hover:-translate-y-1" tabIndex={-1} aria-hidden>
              {product.image ? (
                <img {...sized(product.image, "(min-width: 1024px) 18vw, 40vw")} alt="" {...(eagerFirst && i === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} className={`aspect-square w-full rounded-2xl object-cover shadow-lg ${inStock ? "" : "opacity-60"}`} />
              ) : (
                <span className="grid aspect-square w-full place-items-center rounded-2xl bg-white/20">
                  <LeafIcon className="size-12" />
                </span>
              )}
              {saving && inStock && (
                <span className="absolute top-2 left-2 rounded-full bg-surface px-2.5 py-1 font-display text-caption font-semibold text-fg-brand shadow-sm">
                  {lang === "bn" ? `${saving.toLocaleString("bn-BD")}% ${d.off}` : `${d.off} ${saving}%`}
                </span>
              )}
            </Link>
            <div>
              <h3 className="mt-1 font-display text-h4 leading-tight text-balance">
                <Link href={href} className="hover:underline hover:underline-offset-4">
                  {product.name[lang]}
                </Link>
              </h3>
              <BanglaName name={product.name} lang={lang} className="mt-0.5 text-body-md opacity-90" />
            </div>
            {line && <p className="text-body-sm opacity-85 sm:text-body-md">{line}</p>}
            <div className="mt-auto pt-1">
              <TileBuy
                id={product.id}
                variant={variant.id}
                single={variants.length === 1}
                inStock={inStock}
                href={href}
                label={inStock ? `${d.buy} · ${price}` : d.outOfStockShort}
                item={{ id: itemId(product, variant), name: product.name[lang], variant: variant.label[lang], price: variant.price }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
