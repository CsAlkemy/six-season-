"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartLine {
  id: string;
  qty: number;
}

interface CartApi {
  lines: CartLine[];
  count: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

const KEY = "mt-cart";
const MAX_QTY = 20;
const CartContext = createContext<CartApi | null>(null);

/** The cart is only product ids and quantities in localStorage; prices always come from the server. */
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
      add: (id, qty = 1) =>
        update((prev) =>
          prev.some((l) => l.id === id)
            ? prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
            : [...prev, { id, qty }],
        ),
      setQty: (id, qty) => update((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))),
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
