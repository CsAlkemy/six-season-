"use client";

import { useEffect, useRef } from "react";

import { trackViewItem } from "@/lib/analytics";
import type { Lang, Product } from "@/lib/types";
import { askedVariant, defaultVariant, itemId } from "@/lib/variants";

/**
 * Shows nothing: tells analytics this product page was opened, once, with the size it opened on (an ad's `?size=`
 * link, else the default) so the ID matches the one in the Google feed.
 */
export function TrackProductView({ product, lang }: { product: Product; lang: Lang }) {
  const sent = useRef("");
  useEffect(() => {
    const v = askedVariant(product, window.location.search) ?? defaultVariant(product);
    const id = itemId(product, v);
    if (sent.current === id) return;
    sent.current = id;
    trackViewItem({ id, name: product.name[lang], variant: v.label[lang], price: v.price, qty: 1 });
  }, [product, lang]);
  return null;
}
