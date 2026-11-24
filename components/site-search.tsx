"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { taka } from "@/lib/i18n";
import { sized } from "@/lib/photo-sizes";
import { matchScore, type SearchItem, searchTerms } from "@/lib/search";
import { SHOP_PATH, shopHref } from "@/lib/shop-query";
import type { Lang } from "@/lib/types";

import { ArrowRightIcon, CloseIcon, LeafIcon, SearchIcon } from "./icons";

export interface SiteSearchLabels {
  search: string;
  searchProducts: string;
  clearSearch: string;
  close: string;
  seeAllResults: string;
  noMatchesFor: string;
  browseAll: string;
  categories: string;
  allProducts: string;
  priceFrom: string;
  outOfStock: string;
}

/** Suggestions under the box; the rest are a click (or Enter) away in the shop. */
const SUGGESTIONS = 6;

/**
 * The header's search: a round button like its neighbours that opens a box over the page (globals.css,
 * .site-search). As you type, the products that match (by English or Bangla name, category or tagline; lib/search.ts)
 * show under it with their photo and price; arrow keys move through them and Enter opens one. Enter on the words
 * themselves, or See all, lands on the shop with them (/shop?q=…), where the filters take over. Empty, it offers the
 * categories. The products come with the page (a few fields each), so suggestions need no request.
 */
export function SiteSearch({ items, categories, lang, labels: l }: { items: SearchItem[]; categories: { slug: string; name: string }[]; lang: Lang; labels: SiteSearchLabels }) {
  const router = useRouter();
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(-1);
  const num = (n: number) => n.toLocaleString(lang === "bn" ? "bn-BD" : "en");

  const terms = useMemo(() => searchTerms(text), [text]);
  const matches = useMemo(
    () =>
      terms.length
        ? items
            .map((item) => ({ item, score: matchScore(terms, item.doc) }))
            .filter((m) => m.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((m) => m.item)
        : [],
    [terms, items],
  );
  const shown = matches.slice(0, SUGGESTIONS);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      input.current?.focus();
      input.current?.select();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // Off to another page (a suggestion, a category): the box goes with the old page.
  useEffect(() => setOpen(false), [path]);

  // The highlighted suggestion stays in view in a short window.
  useEffect(() => {
    if (active >= 0) document.getElementById(`${list}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, list]);

  const show = () => {
    // On the shop, start from what it's showing results for, to refine it.
    setText(path === SHOP_PATH ? (new URLSearchParams(location.search).get("q") ?? "") : "");
    setActive(-1);
    setOpen(true);
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const picked = shown[active];
    go(picked ? `/p/${picked.slug}` : shopHref({ q: text }));
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={l.search}
        aria-haspopup="dialog"
        className="grid size-12 place-items-center rounded-full transition-colors hover:bg-muted hover:text-fg-brand"
      >
        <SearchIcon className="size-6" />
      </button>

      <dialog
        ref={dialog}
        aria-label={l.search}
        className="site-search"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      >
        <div className="site-search-panel mx-auto mt-3 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden sm:mt-20 sm:max-h-[calc(100dvh-10rem)]">
          <form action={SHOP_PATH} role="search" onSubmit={submit} className="flex shrink-0 items-center gap-2 border-b border-border py-2 pr-2 pl-5">
            <SearchIcon className="size-5 shrink-0 text-fg-tertiary" />
            <input
              ref={input}
              name="q"
              // Not type="search": its first Esc only empties the box, where Esc here should close it.
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setActive(-1);
              }}
              onKeyDown={(e) => {
                if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                e.preventDefault();
                if (!shown.length) return;
                const by = e.key === "ArrowDown" ? 1 : -1;
                // -1 is the box itself: down from the last suggestion goes back up to it, and up from it to the last.
                setActive((a) => ((a + 1 + by + shown.length + 1) % (shown.length + 1)) - 1);
              }}
              placeholder={l.searchProducts}
              aria-label={l.searchProducts}
              role="combobox"
              aria-expanded={shown.length > 0}
              aria-controls={list}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${list}-${active}` : undefined}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              maxLength={100}
              className="h-12 min-w-0 flex-1 bg-transparent text-body-lg outline-none placeholder:text-fg-tertiary"
            />
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setActive(-1);
                  input.current?.focus();
                }}
                className="h-10 shrink-0 rounded-full px-3 text-body-sm text-fg-secondary transition-colors hover:text-fg-brand"
              >
                {l.clearSearch}
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label={l.close} className="grid size-10 shrink-0 place-items-center rounded-full bg-muted transition-colors hover:bg-brand-soft hover:text-fg-brand">
              <CloseIcon className="size-4.5" />
            </button>
          </form>

          <div className="min-h-0 overflow-y-auto overscroll-contain p-2">
            {!terms.length ? (
              <div className="px-3 pt-3 pb-4">
                <p className="mb-3 text-overline text-fg-tertiary uppercase">{l.categories}</p>
                <ul className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={shopHref({ categories: [c.slug] })} onClick={() => setOpen(false)} className="season-chip inline-flex h-10 items-center rounded-full px-4 text-label-md transition-colors hover:text-fg-brand">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href={SHOP_PATH} onClick={() => setOpen(false)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-label-md text-fg-brand transition-colors hover:bg-brand-soft">
                      {l.allProducts}
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </li>
                </ul>
              </div>
            ) : shown.length ? (
              <>
                <ul id={list} role="listbox" aria-label={l.searchProducts}>
                  {shown.map((item, i) => (
                    <li key={item.id} role="presentation">
                      <Link
                        id={`${list}-${i}`}
                        href={`/p/${item.slug}`}
                        role="option"
                        aria-selected={i === active}
                        tabIndex={-1}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-4 rounded-2xl p-2 pr-3 transition-colors hover:bg-muted ${i === active ? "bg-muted" : ""}`}
                      >
                        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-fg-tertiary">
                          {item.image ? <img {...sized(item.image, "56px")} alt="" className={`size-full object-cover ${item.inStock ? "" : "opacity-60 grayscale-[40%]"}`} /> : <LeafIcon className="size-6" />}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-semibold">{item.doc.name[lang]}</span>
                          {lang !== "bn" && (
                            <span lang="bn" className="truncate text-body-sm text-fg-secondary">
                              {item.doc.name.bn}
                            </span>
                          )}
                        </span>
                        {item.inStock ? (
                          <span className="shrink-0 font-display text-body-md font-semibold whitespace-nowrap">{item.many ? l.priceFrom.replace("{amount}", taka(item.price, lang)) : taka(item.price, lang)}</span>
                        ) : (
                          <span className="shrink-0 text-body-sm whitespace-nowrap text-fg-tertiary">{l.outOfStock}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={shopHref({ q: text })}
                  onClick={() => setOpen(false)}
                  className="mt-1 flex min-h-12 items-center justify-between gap-3 rounded-2xl px-3 text-label-md text-fg-brand transition-colors hover:bg-brand-soft"
                >
                  <span className="min-w-0 truncate">{l.seeAllResults.replace("{q}", text.trim())}</span>
                  <ArrowRightIcon className="size-4 shrink-0" />
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center px-3 py-10 text-center">
                <p className="text-body-md break-words text-fg-secondary">{l.noMatchesFor.replace("{q}", text.trim())}</p>
                <Link href={SHOP_PATH} onClick={() => setOpen(false)} className="btn-secondary mt-4 h-11 text-label-md">
                  {l.browseAll}
                </Link>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
