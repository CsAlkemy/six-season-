"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartLine {
  id: string;
  /** The size; lines saved before products had sizes have none and mean the first. */
  variant?: string;
  qty: number;
}

interface CartApi {
  lines: CartLine[];
  count: number;
  add: (id: string, variant: string | undefined, qty?: number) => void;
  setQty: (id: string, variant: string | undefined, qty: number) => void;
  clear: () => void;
  /** The cart drawer (components/cart-drawer.tsx): opened by Add to cart and the header's bag. */
  drawer: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

/** Two sizes of one product are two lines. */
const same = (line: CartLine, id: string, variant: string | undefined) => line.id === id && line.variant === variant;

const KEY = "mt-cart";
const MAX_QTY = 20;
const CartContext = createContext<CartApi | null>(null);

/**
 * Saved lines as the store reads them: a line saved before products had sizes takes its product's first size, and
 * lines that turn out to be the same size are one line, their quantities added. Without this, an old size-less line
 * and a newer one for that first size showed (and would be ordered) as two.
 */
function tidy(saved: CartLine[], firstSize: Record<string, string>): CartLine[] {
  const out: CartLine[] = [];
  for (const line of saved) {
    if (typeof line?.id !== "string" || !(Number(line.qty) > 0)) continue;
    const variant = line.variant ?? firstSize[line.id];
    const match = out.find((l) => same(l, line.id, variant));
    if (match) match.qty = Math.min(MAX_QTY, match.qty + Number(line.qty));
    else out.push({ id: line.id, variant, qty: Math.min(MAX_QTY, Number(line.qty)) });
  }
  return out;
}

/**
 * The cart is only product ids, sizes and quantities in localStorage; prices always come from the server.
 * `firstSize` is each product's first size, which a line saved without one means.
 */
export function CartProvider({ firstSize, children }: { firstSize: Record<string, string>; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [drawer, setDrawer] = useState(false);
  // Stable, so effects can list them without re-running on every cart change.
  const openDrawer = useCallback(() => setDrawer(true), []);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  // Read once on load; the tidied cart is saved back so it stays that way.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (!Array.isArray(saved)) return;
      const value = tidy(saved, firstSize);
      setLines(value);
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {}
  }, []);

  const update = useCallback((next: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const value = next(prev).filter((line) => line.qty > 0);
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
      } catch {}
      return value;
    });
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      add: (id, size, qty = 1) => {
        const variant = size ?? firstSize[id];
        update((prev) =>
          prev.some((l) => same(l, id, variant))
            ? prev.map((l) => (same(l, id, variant) ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
            : [...prev, { id, variant, qty }],
        );
      },
      setQty: (id, variant, qty) =>
        update((prev) => prev.map((l) => (same(l, id, variant) ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))),
      clear: () => update(() => []),
      drawer,
      openDrawer,
      closeDrawer,
    }),
    [lines, update, drawer, openDrawer, closeDrawer, firstSize],
  );

  return <CartContext value={api}>{children}</CartContext>;
}

export function useCart(): CartApi {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart needs <CartProvider>");
  return cart;
}
