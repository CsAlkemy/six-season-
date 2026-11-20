import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { fontVars } from "@/lib/fonts";
import { STORE_NAME, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t("en").notFoundTitle} · ${STORE_NAME.en}`,
  robots: { index: false },
};

/**
 * An address no route knows: no store layout to sit in, so the logo and the way back to the products. Without this
 * page the store's layout, which owns <html>, would be asked to 404 itself, and the live site answered 500.
 */
export default function GlobalNotFound() {
  const en = t("en");
  return (
    <html lang="en" className={fontVars}>
      <body className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
        <Link href="/en">
          <img src="/logo.svg" alt={STORE_NAME.en} width={120} height={80} className="h-20 w-auto" />
        </Link>
        <p className="mt-10 font-display text-h1 text-fg-tertiary">404</p>
        <h1 className="mt-2 text-h2">{en.notFoundTitle}</h1>
        <p className="mt-3 max-w-md text-body-lg text-fg-secondary">{en.notFoundBody}</p>
        <Link href="/en#products" className="btn-primary mt-8">
          {en.allProducts}
        </Link>
      </body>
    </html>
  );
}
