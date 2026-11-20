"use client";

import Link from "next/link";

import { trackAddToCart, type TrackedItem } from "@/lib/analytics";

import { useCart } from "../cart-provider";

const PILL = "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-current px-5 font-display text-label-md font-semibold transition-colors";

/** A tile's price button: in the cart and the cart open for one size, to the product page to choose among several. */
export function TileBuy({ id, variant, single, inStock, href, label, item }: { id: string; variant: string; single: boolean; inStock: boolean; href: string; label: string; item: Omit<TrackedItem, "qty"> }) {
  const { add, openDrawer } = useCart();
  if (!inStock) return <span className={`${PILL} opacity-60`}>{label}</span>;
  if (!single) {
    return (
      <Link href={href} className={`${PILL} tile-pill`}>
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        add(id, variant);
        openDrawer();
        trackAddToCart({ ...item, qty: 1 });
      }}
      className={`${PILL} tile-pill`}
    >
      {label}
    </button>
  );
}
