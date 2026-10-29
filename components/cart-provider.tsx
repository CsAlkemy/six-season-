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
}

/** Two sizes of one product are two lines. */
const same = (line: CartLine, id: string, variant: string | undefined) => line.id === id && line.variant === variant;

const KEY = "mt-cart";
const MAX_QTY = 20;
const CartContext = createContext<CartApi | null>(null);

/** The cart is only product ids, sizes and quantities in localStorage; prices always come from the server. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(saved)) setLines(saved);
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
      add: (id, variant, qty = 1) =>
        update((prev) =>
          prev.some((l) => same(l, id, variant))
            ? prev.map((l) => (same(l, id, variant) ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
            : [...prev, { id, variant, qty }],
        ),
      setQty: (id, variant, qty) =>
        update((prev) => prev.map((l) => (same(l, id, variant) ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))),
      clear: () => update(() => []),
    }),
    [lines, update],
  );

  return <CartContext value={api}>{children}</CartContext>;
}

export function useCart(): CartApi {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart needs <CartProvider>");
  return cart;
}
