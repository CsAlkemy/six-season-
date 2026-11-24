import Link from "next/link";

import type { Dict } from "@/lib/i18n";
import { type ShopQuery, shopHref } from "@/lib/shop-query";
import type { Lang } from "@/lib/types";

import { ArrowRightIcon } from "../icons";

const STEP = "inline-flex h-11 items-center gap-2 rounded-full px-4 text-label-md transition-colors";
const NUMBER = "grid h-11 min-w-11 place-items-center rounded-full px-2 text-label-md tabular-nums transition-colors";

/** The pages to number: the first, the last, and the ones either side of this one, with gaps (null) between. */
function pageList(page: number, pages: number): (number | null)[] {
  const shown = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return shown.flatMap((n, i) => (i > 0 && n - shown[i - 1]! > 1 ? [null, n] : [n]));
}

/** The shop's pages, as plain links with the same filters, so search engines and the Back button follow them. */
export function Pagination({ query, page, pages, lang, d }: { query: ShopQuery; page: number; pages: number; lang: Lang; d: Dict }) {
  if (pages < 2) return null;
  const href = (n: number) => shopHref({ ...query, page: n });
  const num = (n: number) => n.toLocaleString(lang === "bn" ? "bn-BD" : "en");

  return (
    <nav aria-label={d.pagination} className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:mt-16">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={`${STEP} hover:bg-muted hover:text-fg-brand`}>
          <ArrowRightIcon className="size-4 rotate-180" />
          <span className="max-sm:sr-only">{d.previous}</span>
        </Link>
      )}
      <ol className="flex items-center gap-1">
        {pageList(page, pages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-fg-tertiary">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={d.pageN.replace("{n}", num(n))}
                aria-current={n === page ? "page" : undefined}
                className={`${NUMBER} ${n === page ? "bg-brand text-fg-inverse" : "hover:bg-muted hover:text-fg-brand"}`}
              >
                {num(n)}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className={`${STEP} hover:bg-muted hover:text-fg-brand`}>
          <span className="max-sm:sr-only">{d.next}</span>
          <ArrowRightIcon className="size-4" />
        </Link>
      )}
    </nav>
  );
}
