"use client";

import { useState } from "react";

import { blurStyle } from "@/lib/blur-style";
import type { Lang, Product } from "@/lib/types";

import { ProductMedia } from "./product-media";

/** The product page's photo: the cover large, with a row of thumbnails to switch when there are several. */
export function ProductGallery({ product, lang, dim }: { product: Product; lang: Lang; dim: boolean }) {
  const photos = product.images?.length ? product.images : product.image ? [product.image] : [];
  const [current, setCurrent] = useState(0);
  if (photos.length < 2) return <ProductMedia product={product} lang={lang} className={dim ? "opacity-55" : ""} />;
  return (
    <div>
      <img
        src={photos[current]}
        alt={product.name[lang]}
        style={blurStyle(product.blur?.[photos[current]!])}
        className={`aspect-square w-full bg-muted object-cover ${dim ? "opacity-55" : ""}`}
      />
      <ul className="flex gap-2 overflow-x-auto p-3 sm:p-4">
        {photos.map((url, i) => (
          <li key={url} className="shrink-0">
            <button type="button" onClick={() => setCurrent(i)} aria-label={`${product.name[lang]} ${i + 1}`} aria-current={i === current} className={`block size-16 overflow-hidden rounded-lg border-2 transition sm:size-20 ${i === current ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}>
              <img src={url} alt="" loading="lazy" style={blurStyle(product.blur?.[url])} className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
