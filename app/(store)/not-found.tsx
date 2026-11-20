"use client";

import Link from "next/link";

import { t } from "@/lib/i18n";
import { STORE_LANG } from "@/lib/types";

/**
 * A missing product, category, post or page inside the store: the header and footer stay,
 * with the way back to the products. Next.js answers 404 and adds noindex itself.
 */
export default function NotFound() {
  const lang = STORE_LANG;
  const d = t(lang);
  return (
    <div className="container-page flex flex-col items-center py-20 text-center sm:py-28">
      <p className="font-display text-h1 text-fg-tertiary">404</p>
      <h1 className="mt-2 text-h2 sm:text-h1">{d.notFoundTitle}</h1>
      <p className="mt-4 max-w-md text-body-lg text-fg-secondary">{d.notFoundBody}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/#products`} className="btn-primary">
          {d.allProducts}
        </Link>
        <Link href={`/track`} className="btn border border-border">
          {d.trackOrder}
        </Link>
      </div>
    </div>
  );
}
