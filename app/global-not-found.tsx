import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { fontVars } from "@/lib/fonts";
import { STORE_NAME, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t("bn").notFoundTitle} · ${STORE_NAME.bn}`,
  robots: { index: false },
};

/**
 * An address outside both languages (/xyz): no store layout to sit in, so the logo and both ways in. Without this
 * page the store's layout, which owns <html>, would be asked to 404 itself, and the live site answered 500.
 */
export default function GlobalNotFound() {
  const bn = t("bn");
  const en = t("en");
  return (
    <html lang="bn" className={fontVars}>
      <body className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
        <Link href="/bn">
          <img src="/logo.svg" alt={STORE_NAME.bn} width={120} height={80} className="h-20 w-auto" />
        </Link>
        <p className="mt-10 font-display text-h1 text-fg-tertiary">404</p>
        <h1 className="mt-2 text-h2">{bn.notFoundTitle}</h1>
        <p className="mt-1 text-body-lg text-fg-secondary" lang="en">
          {en.notFoundTitle}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/bn#products" className="btn-primary">
            {bn.allProducts}
          </Link>
          <Link href="/en#products" className="btn border border-border" lang="en">
            {en.allProducts}
          </Link>
        </div>
      </body>
    </html>
  );
}
