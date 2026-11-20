"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { taka } from "@/lib/i18n";
import { sized } from "@/lib/photo-sizes";
import type { Lang, Text, Variant } from "@/lib/types";

import { QtyStepper } from "./add-to-cart";
import { useCart } from "./cart-provider";
import { ArrowRightIcon, BagIcon, CloseIcon, LeafIcon, TrashIcon } from "./icons";

/** What the drawer needs of a product, so every page doesn't carry the whole catalogue: only the shown ones. */
export interface CartProduct {
  id: string;
  slug: string;
  name: Text;
  image?: string;
  variants: Variant[];
}

export interface CartLabels {
  yourCart: string;
  close: string;
  each: string;
  remove: string;
  subtotal: string;
  deliveryAtCheckout: string;
  checkout: string;
  continueShopping: string;
  emptyCart: string;
  cartUnavailable: string;
}

/** As long as the panel's slide (CSS below), so closing finishes on screen before the dialog goes. */
const SLIDE_MS = 250;

/**
 * The cart as a panel from the right, opened by Add to cart and the header's bag: each line with its photo, size,
 * price each, a quantity stepper, its total and a remove button; the subtotal, and the way on to the order form
 * (/cart), where delivery is added. A native modal <dialog>, so focus stays inside, Esc closes it and the page
 * behind is inert; a click on the dimmed page closes it too. The lines are read the way the order form reads them:
 * hidden products and sold-out or removed sizes drop out, and what's on the shelf caps each quantity.
 */
export function CartDrawer({ lang, products, labels: l }: { lang: Lang; products: CartProduct[]; labels: CartLabels }) {
  const cart = useCart();
  const { drawer, closeDrawer } = cart;
  const dialog = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(false);
  const path = usePathname();

  // Open: show the dialog, then slide the panel in on the next frame. Close: slide out, then close the dialog.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (drawer) {
      if (!d.open) d.showModal();
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = setTimeout(() => d.open && d.close(), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [drawer]);

  // Moving to another page (Checkout, a product) closes it.
  useEffect(() => closeDrawer(), [path, closeDrawer]);

  const found = cart.lines.flatMap((line) => {
    const product = products.find((p) => p.id === line.id);
    const variant = product && (line.variant ? product.variants.find((v) => v.id === line.variant) : product.variants[0]);
    return product && variant ? [{ product, variant, line }] : [];
  });
  const lines = found.filter((x) => x.variant.inStock).map((x) => ({ ...x, qty: Math.min(x.line.qty, 20, x.variant.stock ?? 20) }));
  const unavailable = cart.lines.length - lines.length;
  const count = lines.reduce((n, x) => n + x.qty, 0);
  const subtotal = lines.reduce((sum, x) => sum + x.variant.price * x.qty, 0);
  const num = (n: number) => n.toLocaleString(lang === "bn" ? "bn-BD" : "en");

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cart-drawer-title"
      className="cart-drawer"
      data-shown={shown || undefined}
      // Esc: slide out like the close button rather than vanish.
      onCancel={(e) => {
        e.preventDefault();
        closeDrawer();
      }}
      onClick={(e) => e.target === e.currentTarget && closeDrawer()}
    >
      <div className="cart-drawer-panel flex h-full flex-col bg-surface shadow-card">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <h2 id="cart-drawer-title" className="text-h4">
            {l.yourCart} {count > 0 && <span className="text-body-md font-normal text-fg-tertiary">({num(count)})</span>}
          </h2>
          <button type="button" onClick={closeDrawer} aria-label={l.close} className="grid size-11 place-items-center rounded-full bg-muted transition-colors hover:bg-brand-soft hover:text-fg-brand">
            <CloseIcon />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <BagIcon className="size-12 text-fg-tertiary" />
            <p className="text-body-lg text-fg-secondary">{l.emptyCart}</p>
            {unavailable > 0 && <p className="text-body-sm text-soil-700">{l.cartUnavailable}</p>}
            <Link href={`/#products`} onClick={closeDrawer} className="btn-primary mt-2">
              {l.continueShopping}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
              {unavailable > 0 && <p className="mt-4 rounded-md bg-mustard-100 p-3 text-body-sm text-soil-700" role="status">{l.cartUnavailable}</p>}
              <ul className="divide-y divide-border">
                {lines.map(({ product, variant, line, qty }) => (
                  <li key={`${product.id}:${variant.id}`} className="flex gap-4 py-5">
                    <Link href={`/p/${product.slug}`} onClick={closeDrawer} className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-fg-tertiary">
                      {product.image ? <img {...sized(product.image, "80px")} alt="" className="size-full object-cover" /> : <LeafIcon className="size-8" />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/p/${product.slug}`} onClick={closeDrawer} className="font-semibold leading-snug hover:text-fg-brand">
                            {product.name[lang]}
                          </Link>
                          <p className="mt-0.5 font-display text-body-sm text-fg-secondary">
                            {variant.label[lang]} · {taka(variant.price, lang)} {l.each}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => cart.setQty(line.id, line.variant, 0)}
                          aria-label={`${l.remove}: ${product.name[lang]}`}
                          className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-fg-tertiary transition-colors hover:border-fg-error hover:bg-error-soft hover:text-fg-error"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <QtyStepper small value={qty} max={Math.min(20, variant.stock ?? 20)} onChange={(n) => cart.setQty(line.id, line.variant, n)} />
                        <span className="font-display text-body-lg font-semibold tabular-nums">{taka(variant.price * qty, lang)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="border-t border-border px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
              <p className="flex items-baseline justify-between gap-4">
                <span className="text-label-md">{l.subtotal}</span>
                <span className="font-display text-h4 text-fg-brand tabular-nums">{taka(subtotal, lang)}</span>
              </p>
              <p className="mt-1 text-body-sm text-fg-tertiary">{l.deliveryAtCheckout}</p>
              <Link href={`/cart`} onClick={closeDrawer} className="btn-primary mt-4 h-13 w-full text-label-md">
                {l.checkout}
                <ArrowRightIcon className="size-4.5" />
              </Link>
              <button type="button" onClick={closeDrawer} className="mx-auto mt-3 block text-body-sm text-fg-secondary underline underline-offset-4 hover:text-fg-brand">
                {l.continueShopping}
              </button>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}
