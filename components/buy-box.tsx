"use client";

import { useState } from "react";

import { type Dict, taka } from "@/lib/i18n";
import type { Lang, Product } from "@/lib/types";
import { defaultVariant, savingPercent, variantsOf } from "@/lib/variants";

import { CardActions, QtyStepper } from "./add-to-cart";

/** The product page's price, size chips, quantity and buttons; picking a size moves the price with it. */
export function BuyBox({ product, lang, d }: { product: Product; lang: Lang; d: Dict }) {
  const variants = variantsOf(product);
  const [variantId, setVariantId] = useState(() => defaultVariant(product).id);
  const [qty, setQty] = useState(1);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0]!;
  const saving = savingPercent(variant);

  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-display text-h2 text-fg-brand">{taka(variant.price, lang)}</span>
        {variant.compareAt && saving && (
          <>
            <s className="font-display text-body-lg text-fg-tertiary">{taka(variant.compareAt, lang)}</s>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 font-display text-caption font-semibold text-fg-brand">
              {lang === "bn" ? `${saving.toLocaleString("bn-BD")}% ${d.off}` : `${d.off} ${saving}%`}
            </span>
          </>
        )}
      </p>

      {variants.length > 1 && (
        <fieldset>
          <legend className="mb-3 text-label">
            {d.size}: <span className="font-display font-medium text-fg-secondary">{variant.label[lang]}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => {
              const checked = v.id === variant.id;
              return (
                <label
                  key={v.id}
                  className={`relative flex h-12 min-w-20 cursor-pointer items-center justify-center rounded-full border px-5 font-display text-body-md font-semibold transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
                    checked ? "border-brand bg-brand-soft text-fg-brand ring-1 ring-brand" : "border-border-strong bg-surface hover:border-fg-primary"
                  } ${v.inStock ? "" : "text-fg-tertiary line-through decoration-1"}`}
                >
                  <input type="radio" name="size" value={v.id} checked={checked} onChange={() => setVariantId(v.id)} className="sr-only" />
                  {v.label[lang]}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {variant.inStock ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <QtyStepper value={qty} onChange={setQty} />
          <div className="@container flex-1">
            <CardActions id={product.id} variant={variant.id} qty={qty} cartHref={`/${lang}/cart`} label={d.addToCart} addedLabel={d.added} buyLabel={d.buyNow} />
          </div>
        </div>
      ) : (
        <p className="btn w-full bg-muted text-fg-tertiary">{d.outOfStock}</p>
      )}
    </div>
  );
}
