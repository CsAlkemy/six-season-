"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useOptimistic, useTransition } from "react";

import { type ShopQuery, shopHref } from "@/lib/shop-query";
import type { Lang } from "@/lib/types";

import type { ShopLabels } from "./labels";

interface Shop {
  /** What the shop shows, or is about to: a choice shows as made at once, while its products load. */
  query: ShopQuery;
  /** Products for a new choice are on their way. */
  pending: boolean;
  /** Show the shop for this query, keeping the page where it is. */
  go: (next: ShopQuery) => void;
  lang: Lang;
  labels: ShopLabels;
}

const ShopContext = createContext<Shop | null>(null);

export function useShop(): Shop {
  const shop = use(ShopContext);
  if (!shop) throw new Error("useShop outside <ShopProvider>");
  return shop;
}

/**
 * The shop's filters and its products share one query: the server's, from the address, until a filter is changed,
 * then that change at once (the box ticks, the chip appears) while the server works out the products for it.
 */
export function ShopProvider({ query: committed, lang, labels, children }: { query: ShopQuery; lang: Lang; labels: ShopLabels; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useOptimistic(committed);

  const go = (next: ShopQuery) => {
    // Scrolled down past the top of the products: back up to them, since the list is about to change under the reader.
    const results = document.getElementById("shop-results");
    if (results && results.getBoundingClientRect().top < 0) results.scrollIntoView({ behavior: "smooth", block: "start" });
    startTransition(() => {
      setQuery(next);
      router.push(shopHref(next), { scroll: false });
    });
  };

  return <ShopContext value={{ query, pending, go, lang, labels }}>{children}</ShopContext>;
}

/** The products, faded while the next ones load, so a click visibly did something. */
export function ShopResults({ children }: { children: ReactNode }) {
  const { pending } = useShop();
  return (
    <div id="shop-results" aria-busy={pending} className={`scroll-mt-28 transition-opacity duration-200 lg:scroll-mt-32 ${pending ? "opacity-50 delay-100" : ""}`}>
      {children}
    </div>
  );
}
