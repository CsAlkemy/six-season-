"use client";

import { type FormEvent, type ReactNode, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";

import { taka } from "@/lib/i18n";
import { SEASON_NAME } from "@/lib/season";
import type { ShopFacets } from "@/lib/shop";
import { filterCount, parseTaka, SHOP_PATH, type ShopQuery, withoutFilters } from "@/lib/shop-query";
import type { Lang } from "@/lib/types";

import { CheckIcon, FilterIcon, SeasonIcon } from "../icons";
import type { ShopLabels } from "./labels";
import { useShop } from "./shop-provider";

/** A list of choices as one soft panel, like a phone's settings: its rows sit inside the tint. */
const GROUP = "flex flex-col gap-1 rounded-[1.25rem] bg-muted p-1";
/**
 * A choice in that panel: the whole row is the target, lighter on hover, and lifted out of the panel in white once
 * it's on. Its input is hidden, so the row shows focus.
 */
const ROW =
  "group flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[1rem] px-2.5 text-label font-medium transition-[background-color,box-shadow] duration-200 hover:bg-surface/60 has-checked:bg-surface has-checked:shadow-[0_1px_2px_#1d1d1b0f,0_6px_16px_-8px_#1d1d1b33] has-focus-visible:outline-2 has-focus-visible:outline-brand has-disabled:cursor-default has-disabled:opacity-40 has-disabled:hover:bg-transparent";
/** A season: a small tile with its icon and names, filled green once it's on. */
const TILE =
  "group flex h-full cursor-pointer flex-col rounded-lg bg-muted p-3 transition-colors hover:bg-brand-soft has-checked:bg-brand has-checked:text-fg-inverse has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand has-disabled:cursor-default has-disabled:opacity-40 has-disabled:hover:bg-muted";
const COUNT = "text-caption text-fg-tertiary tabular-nums";
/** How many a row would show, as a small pill: white in the panel, green once the row is on. */
const COUNT_PILL =
  "min-w-6 rounded-full bg-surface px-1.5 py-0.5 text-center text-caption text-fg-tertiary tabular-nums transition-colors group-has-checked:bg-brand-soft group-has-checked:text-fg-brand";
const PRICE_BOX =
  "h-11 w-full rounded-full bg-muted pr-3 pl-8 text-body-sm tabular-nums outline-none transition placeholder:text-fg-tertiary focus:bg-surface focus:ring-2 focus:ring-brand";

const subscribeNever = () => () => {};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-overline text-fg-tertiary uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * The tick box drawn in a row; it follows the row's hidden input. A soft square that greens at the edge on hover, and
 * once ticked fills green with a glow, its tick popping in.
 */
function Tick() {
  return (
    <span
      aria-hidden
      className="grid size-5.5 shrink-0 place-items-center rounded-[0.4375rem] border-[1.5px] border-neutral-300 bg-surface text-fg-inverse shadow-[inset_0_1px_2px_#1d1d1b0f] transition-[background-color,border-color,box-shadow] duration-200 group-hover:border-fresh-300 group-has-checked:border-brand group-has-checked:bg-brand group-has-checked:shadow-[0_3px_8px_-2px_#16845680] group-has-disabled:group-hover:border-neutral-300"
    >
      <CheckIcon className="size-3.5 scale-50 opacity-0 transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.3,1.6,0.5,1)] [stroke-width:3.5] group-has-checked:scale-100 group-has-checked:opacity-100" />
    </span>
  );
}

/**
 * The shop's filters: categories, seasons, a price range and in stock only, each choice with how many products it
 * would show (none: greyed out, unless it's on). A tick shows the products at once, and so does letting go of a price
 * handle; a typed price waits for Apply or Enter. It's a real form to /shop, so without JavaScript Apply still sends
 * every choice. A card beside the products on a wide screen (`heading`), and the Filters drawer's body on a phone
 * (shop-toolbar.tsx).
 */
export function ShopFilters({ facets, heading = false }: { facets: ShopFacets; heading?: boolean }) {
  const { query, go, lang, labels: l } = useShop();
  const num = (n: number) => n.toLocaleString(lang === "bn" ? "bn-BD" : "en");
  const active = filterCount(query);
  // Before hydration (or without JavaScript) Apply is the only way to send the form, so it's there from the start.
  const live = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  // The boxes follow the shop's range when it changes from elsewhere (a chip, Clear all), and keep what's typed till then.
  const range = `${query.min ?? ""}-${query.max ?? ""}`;
  const [shownRange, setShownRange] = useState(range);
  const [min, setMin] = useState(query.min?.toString() ?? "");
  const [max, setMax] = useState(query.max?.toString() ?? "");
  const [typed, setTyped] = useState(false);
  if (shownRange !== range) {
    setShownRange(range);
    setMin(query.min?.toString() ?? "");
    setMax(query.max?.toString() ?? "");
    setTyped(false);
  }

  const toggle = (key: "categories" | "seasons", value: string) => {
    const list: string[] = query[key];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    go({ ...query, [key]: next, page: 1 } as ShopQuery);
  };

  const applyPrice = (lo: string, hi: string) => {
    setTyped(false);
    let a = parseTaka(lo);
    let b = parseTaka(hi);
    if (a !== null && b !== null && a > b) [a, b] = [b, a];
    if (a === query.min && b === query.max) return;
    go({ ...query, min: a, max: b, page: 1 });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    applyPrice(min, max);
  };

  return (
    <form
      action={SHOP_PATH}
      onSubmit={submit}
      className={`@container flex flex-col gap-7 ${heading ? "rounded-[1.75rem] bg-surface/85 p-5 shadow-[0_1px_2px_#0000000a,0_18px_40px_-24px_#1d1d1b26] backdrop-blur-md" : ""}`}
    >
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.sort && <input type="hidden" name="sort" value={query.sort} />}

      {heading && (
        <div className="-mb-1 flex min-h-9 items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-h4">
            <FilterIcon className="size-5 text-fg-secondary" />
            {l.filters}
            {active > 0 && <span className="grid h-5.5 min-w-5.5 place-items-center rounded-full bg-brand px-1.5 text-caption text-fg-inverse tabular-nums">{num(active)}</span>}
          </h2>
          {active > 0 && (
            <button
              type="button"
              onClick={() => go(withoutFilters(query))}
              className="h-8 rounded-full bg-muted px-3 text-caption text-fg-secondary transition-colors hover:bg-brand-soft hover:text-fg-brand"
            >
              {l.clearAll}
            </button>
          )}
        </div>
      )}

      {facets.categories.length > 1 && (
        <Section title={l.categories}>
          <ul className={GROUP}>
            {facets.categories.map((c) => {
              const on = query.categories.includes(c.slug);
              return (
                <li key={c.slug}>
                  <label className={ROW}>
                    <input type="checkbox" name="category" value={c.slug} checked={on} disabled={!on && c.count === 0} onChange={() => toggle("categories", c.slug)} className="sr-only" />
                    <Tick />
                    <span className="flex-1">{c.name}</span>
                    <span className={COUNT_PILL}>{num(c.count)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {facets.seasons.length > 0 && (
        <Section title={l.season}>
          <ul className="grid grid-cols-2 gap-2 @xs:grid-cols-3">
            {facets.seasons.map(({ id: season, count }) => {
              const on = query.seasons.includes(season);
              return (
                <li key={season}>
                  <label className={TILE}>
                    <input type="checkbox" name="season" value={season} checked={on} disabled={!on && count === 0} onChange={() => toggle("seasons", season)} className="sr-only" />
                    <span className="flex items-center justify-between gap-2">
                      <SeasonIcon season={season} className="size-5" />
                      <span className={`${COUNT} group-has-checked:text-fg-inverse/80`}>{num(count)}</span>
                    </span>
                    {/* By their Bangla names, as in the season picker, with the English small under them. */}
                    <span lang="bn" className="mt-2.5 text-body-md leading-tight font-semibold">
                      {SEASON_NAME[season].bn}
                    </span>
                    {lang !== "bn" && <span className="text-caption text-fg-tertiary group-has-checked:text-fg-inverse/80">{SEASON_NAME[season].en}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {facets.price && (
        <Section title={l.price}>
          <PriceSlider
            bounds={facets.price}
            min={min}
            max={max}
            lang={lang}
            labels={l}
            onSlide={(lo, hi) => {
              setTyped(false);
              setMin(lo);
              setMax(hi);
            }}
            onCommit={applyPrice}
          />
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <PriceBox
              label={l.min}
              name="min"
              value={min}
              placeholder={num(facets.price.min)}
              onChange={(v) => {
                setMin(v);
                setTyped(true);
              }}
            />
            <span aria-hidden className="text-fg-tertiary">
              –
            </span>
            <PriceBox
              label={l.max}
              name="max"
              value={max}
              placeholder={num(facets.price.max)}
              onChange={(v) => {
                setMax(v);
                setTyped(true);
              }}
            />
          </div>
          {(!live || typed) && (
            <button type="submit" className="btn-primary mt-3 h-10 w-full text-label-md">
              {l.apply}
            </button>
          )}
        </Section>
      )}

      <Section title={l.availability}>
        <label className="group flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[1.25rem] bg-muted pr-3 pl-3.5 text-label font-medium has-disabled:cursor-default has-disabled:opacity-40">
          <span className="flex items-center gap-2">
            {l.inStockOnly}
            <span className={COUNT_PILL}>{num(facets.inStock)}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            name="stock"
            value="in"
            checked={query.inStock}
            disabled={!query.inStock && facets.inStock === 0}
            onChange={() => go({ ...query, inStock: !query.inStock, page: 1 })}
            className="peer sr-only"
          />
          {/* The switch: a pill whose knob slides across and turns it green when it's on. */}
          <span
            aria-hidden
            className="relative h-6.5 w-11 shrink-0 rounded-full bg-border-strong transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:top-0.75 after:left-0.75 after:size-5 after:rounded-full after:bg-surface after:shadow-[0_1px_3px_#1d1d1b40] after:transition-transform peer-checked:after:translate-x-4.5"
          />
        </label>
      </Section>
    </form>
  );
}

function PriceBox({ label, name, value, placeholder, onChange }: { label: string; name: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-body-sm text-fg-tertiary">
        ৳
      </span>
      <input name={name} inputMode="numeric" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={PRICE_BOX} />
    </label>
  );
}

/**
 * Two handles on one track, from the cheapest size on show to the dearest. They move in steps of a hundredth of the
 * way (the price rounded to ৳10 when the range is wide), and the ends mean "no limit", so the boxes go back to their
 * hints there. Letting go of a handle (or each step by keyboard) shows the products for it.
 */
function PriceSlider({
  bounds,
  min,
  max,
  lang,
  labels: l,
  onSlide,
  onCommit,
}: {
  bounds: { min: number; max: number };
  min: string;
  max: string;
  lang: Lang;
  labels: ShopLabels;
  onSlide: (min: string, max: string) => void;
  onCommit: (min: string, max: string) => void;
}) {
  const span = bounds.max - bounds.min;
  const unit = span >= 1000 ? 10 : 1;
  const toPos = (price: number) => (span > 0 ? Math.min(100, Math.max(0, Math.round(((price - bounds.min) / span) * 100))) : 0);
  const toPrice = (pos: number) => (pos <= 0 ? bounds.min : pos >= 100 ? bounds.max : Math.round((bounds.min + (span * pos) / 100) / unit) * unit);

  const minPrice = parseTaka(min) ?? bounds.min;
  const maxPrice = parseTaka(max) ?? bounds.max;
  const lo = toPos(minPrice);
  const hi = toPos(maxPrice);

  /** The boxes' values for a handle moved to `pos`, kept from crossing the other one. */
  const moved = (end: "min" | "max", pos: number): [string, string] =>
    end === "min" ? [Math.min(pos, hi) <= 0 ? "" : String(toPrice(Math.min(pos, hi))), max] : [min, Math.max(pos, lo) >= 100 ? "" : String(toPrice(Math.max(pos, lo)))];

  // A range input's own change event comes once a handle is let go (or a key moves it), not on every step of a drag.
  const loInput = useRef<HTMLInputElement>(null);
  const hiInput = useRef<HTMLInputElement>(null);
  const commit = useEffectEvent((end: "min" | "max", pos: number) => onCommit(...moved(end, pos)));
  useEffect(() => {
    const ends = [
      [loInput.current, "min"],
      [hiInput.current, "max"],
    ] as const;
    const offs = ends.map(([input, end]) => {
      if (!input) return () => {};
      const done = () => commit(end, input.valueAsNumber);
      input.addEventListener("change", done);
      return () => input.removeEventListener("change", done);
    });
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <div className="relative h-5.5">
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
      <span aria-hidden className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand" style={{ left: `${Math.min(lo, hi)}%`, right: `${100 - Math.max(lo, hi)}%` }} />
      {/* Both at the right-hand end, the low handle is on top, so it can still be pulled back. */}
      <input
        ref={loInput}
        type="range"
        min={0}
        max={100}
        value={lo}
        onChange={(e) => onSlide(...moved("min", e.target.valueAsNumber))}
        aria-label={l.min}
        aria-valuetext={taka(minPrice, lang)}
        className={`price-range ${lo > 50 ? "z-10" : ""}`}
      />
      <input
        ref={hiInput}
        type="range"
        min={0}
        max={100}
        value={hi}
        onChange={(e) => onSlide(...moved("max", e.target.valueAsNumber))}
        aria-label={l.max}
        aria-valuetext={taka(maxPrice, lang)}
        className="price-range"
      />
    </div>
  );
}
