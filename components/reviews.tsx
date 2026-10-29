import { type Dict, STORE_NAME } from "@/lib/i18n";
import type { RatingSummary } from "@/lib/reviews";
import type { Lang, Review } from "@/lib/types";

import { CheckIcon } from "./icons";
import { ReviewBox } from "./review-box";
import { Stars } from "./stars";

const num = (n: number, lang: Lang, digits = 0) =>
  n.toLocaleString(lang === "bn" ? "bn-BD" : "en", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const date = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" });

/** "৪.৮ (১২টি রিভিউ)" / "4.8 (12 reviews)", for star labels. */
export const ratingLabel = (summary: RatingSummary, lang: Lang, d: Dict) =>
  `${num(summary.average, lang, 1)} / ${num(5, lang)} · ${num(summary.count, lang)} ${d.reviewsCount}`;

/** The product page's reviews: the average and its spread, the approved reviews with the store's replies, and the box to write one. */
export function ReviewsSection({ productId, reviews, summary, lang, d }: { productId: string; reviews: Review[]; summary: RatingSummary; lang: Lang; d: Dict }) {
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28 border-t border-border pt-12 sm:pt-16">
      <h2 id="reviews-title" className="text-h3 sm:text-h2">{d.reviews}</h2>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-6 lg:sticky lg:top-28">
          {summary.count > 0 ? (
            <div className="rounded-xl bg-muted p-6">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-h1">{num(summary.average, lang, 1)}</span>
                <span className="font-display text-body-lg font-medium text-fg-secondary">/ {num(5, lang)}</span>
              </p>
              <Stars value={summary.average} label={ratingLabel(summary, lang, d)} className="size-5" />
              <p className="mt-1 font-display text-body-md font-medium text-fg-secondary">
                {num(summary.count, lang)} {d.reviewsCount}
              </p>
              <ul className="mt-5 flex flex-col gap-2">
                {summary.byStars.map((count, i) => (
                  <li key={i} className="flex items-center gap-3 font-display text-body-sm font-medium text-fg-secondary">
                    <span className="w-3 text-right">{num(5 - i, lang)}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                      <span className="block h-full rounded-full bg-mustard-500" style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }} />
                    </span>
                    <span className="w-6 tabular-nums">{num(count, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-6 text-fg-secondary">{d.noReviews}</p>
          )}
          <ReviewBox productId={productId} lang={lang} d={d} />
        </div>

        {reviews.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-3 py-6 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={review.rating} label={`${num(review.rating, lang)} / ${num(5, lang)}`} />
                  <span className="font-semibold">{review.name}</span>
                  <span className="inline-flex items-center gap-1 text-body-sm font-medium text-fg-sage">
                    <CheckIcon className="size-4" />
                    {d.verifiedBuyer}
                  </span>
                  <span className="text-body-sm text-fg-tertiary sm:ml-auto">{date(review.createdAt, lang)}</span>
                </div>
                <p className="whitespace-pre-line">{review.text}</p>
                {review.reply && (
                  <div className="rounded-lg border-l-4 border-brand bg-brand-soft/60 px-4 py-3">
                    <p className="text-label-md text-fg-brand">{d.storeReply.replace("{store}", STORE_NAME[lang])}</p>
                    <p className="mt-1 whitespace-pre-line text-body-sm text-fg-secondary">{review.reply.text}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
