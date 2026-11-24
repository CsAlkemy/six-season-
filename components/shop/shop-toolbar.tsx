"use client";

import { useEffect, useId, useRef, useState } from "react";

import { taka } from "@/lib/i18n";
import { SEASON_NAME } from "@/lib/season";
import type { ShopFacets } from "@/lib/shop";
import { filterCount, type ShopQuery, type Sort, sortOf, withoutFilters } from "@/lib/shop-query";

import { ChevronDownIcon, CloseIcon, FilterIcon } from "../icons";
import { ShopFilters } from "./shop-filters";
import { useShop } from "./shop-provider";

/**
 * Over the products: on a phone the Filters button (with how many are on) that opens them in a drawer, how many
 * products there are (read out when it changes), the order they're in, and a chip for each filter that's on, which
 * takes it off.
 */
export function ShopToolbar({ total, facets }: { total: number; facets: ShopFacets }) {
  const { query, go, lang, labels: l } = useShop();
  const [drawer, setDrawer] = useState(false);
  const num = (n: number) => n.toLocaleString(lang === "bn" ? "bn-BD" : "en");
  const count = filterCount(query);

  const sorts: [Sort, string][] = [
    ...(query.q ? [["relevance", l.sortRelevance] as [Sort, string]] : []),
    ["featured", l.sortFeatured],
    ["price-asc", l.sortPriceAsc],
    ["price-desc", l.sortPriceDesc],
    ["name", l.sortName],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setDrawer(true)} aria-haspopup="dialog" className="btn-secondary h-11 gap-2 px-4 text-label-md sm:px-5 lg:hidden">
            <FilterIcon className="size-4.5" />
            {l.filters}
            {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-caption text-fg-inverse">{num(count)}</span>}
          </button>
          <p role="status" className="text-body-md text-fg-secondary max-sm:sr-only">
            {total === 1 ? l.oneProduct : l.nProducts.replace("{n}", num(total))}
          </p>
        </div>
        <label className="relative flex items-center gap-2">
          <span className="text-body-sm text-fg-secondary max-sm:sr-only">{l.sortBy}</span>
          <select
            value={sortOf(query)}
            onChange={(e) => go({ ...query, sort: e.target.value as Sort, page: 1 })}
            className="h-11 cursor-pointer appearance-none rounded-full border border-border-strong bg-surface pr-10 pl-4 text-label-md transition-colors outline-none hover:border-border-brand focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand-soft"
          >
            {sorts.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-4 size-4 text-fg-secondary" />
        </label>
      </div>

      <ActiveFilters facets={facets} />
      <FilterDrawer open={drawer} onClose={() => setDrawer(false)} total={total} facets={facets} />
    </div>
  );
}

/** A chip for the search and each filter that's on; its cross takes it off. Clear all, once there are a few. */
function ActiveFilters({ facets }: { facets: ShopFacets }) {
  const { query, go, lang, labels: l } = useShop();
  const chips: { key: string; label: string; next: ShopQuery }[] = [];
  const off = (change: Partial<ShopQuery>): ShopQuery => ({ ...query, ...change, page: 1 });

  if (query.q) chips.push({ key: "q", label: `“${query.q}”`, next: off({ q: "", sort: query.sort === "relevance" ? null : query.sort }) });
  for (const slug of query.categories) {
    const name = facets.categories.find((c) => c.slug === slug)?.name ?? slug;
    chips.push({ key: `c-${slug}`, label: name, next: off({ categories: query.categories.filter((c) => c !== slug) }) });
  }
  for (const season of query.seasons) {
    chips.push({ key: `s-${season}`, label: SEASON_NAME[season][lang], next: off({ seasons: query.seasons.filter((s) => s !== season) }) });
  }
  if (query.min !== null || query.max !== null) {
    const label =
      query.min !== null && query.max !== null
        ? `${taka(query.min, lang)} – ${taka(query.max, lang)}`
        : query.min !== null
          ? l.priceFrom.replace("{amount}", taka(query.min, lang))
          : l.priceUpTo.replace("{amount}", taka(query.max!, lang));
    chips.push({ key: "price", label, next: off({ min: null, max: null }) });
  }
  if (query.inStock) chips.push({ key: "stock", label: l.inStockOnly, next: off({ inStock: false }) });

  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => go(chip.next)}
            aria-label={`${l.remove}: ${chip.label}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-brand bg-brand-soft pr-2.5 pl-3.5 text-label-md text-fg-brand transition-colors hover:bg-brand hover:text-fg-inverse"
          >
            {chip.label}
            <CloseIcon className="size-3.5" />
          </button>
        </li>
      ))}
      {filterCount(query) > 1 && (
        <li>
          <button type="button" onClick={() => go(withoutFilters(query))} className="h-9 px-2 text-body-sm text-fg-secondary underline underline-offset-4 hover:text-fg-brand">
            {l.clearAll}
          </button>
        </li>
      )}
    </ul>
  );
}

/**
 * The filters on a phone: a panel from the left over the dimmed page (globals.css, .shop-drawer), the same form as
 * the sidebar. Choices apply as they're made, so the products are ready behind it; the button just closes it.
 */
function FilterDrawer({ open, onClose, total, facets }: { open: boolean; onClose: () => void; total: number; facets: ShopFacets }) {
  const { query, go, pending, lang, labels: l } = useShop();
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const num = (n: number) => n.toLocaleString(lang === "bn" ? "bn-BD" : "en");

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Widened past a phone (a tablet turned): the sidebar has the filters, and a hidden modal would leave the page inert.
  useEffect(() => {
    if (!open) return;
    const wide = matchMedia("(min-width: 64rem)");
    const check = () => wide.matches && onClose();
    check();
    wide.addEventListener("change", check);
    return () => wide.removeEventListener("change", check);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      className="shop-drawer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="shop-drawer-panel flex h-full flex-col bg-surface">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 id={title} className="text-h4">
            {l.filters}
          </h2>
          <button type="button" onClick={onClose} aria-label={l.close} className="grid size-11 place-items-center rounded-full bg-muted transition-colors hover:bg-brand-soft hover:text-fg-brand">
            <CloseIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5">
          <ShopFilters facets={facets} />
        </div>
        <footer className="flex gap-3 border-t border-border px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button type="button" disabled={filterCount(query) === 0} onClick={() => go(withoutFilters(query))} className="btn-secondary h-13 flex-1 px-4 text-label-md">
            {l.clearAll}
          </button>
          <button type="button" onClick={onClose} aria-busy={pending} className={`btn-primary h-13 flex-[2] px-4 text-label-md transition-opacity ${pending ? "opacity-70" : ""}`}>
            {total === 1 ? l.showOneProduct : l.showProducts.replace("{n}", num(total))}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
