import Link from "next/link";

import { t } from "@/lib/i18n";
import { sized } from "@/lib/photo-sizes";
import type { Lang, Product, Settings } from "@/lib/types";

import { StarIcon } from "../icons";

/**
 * One real customer's words (Settings › Home page › Featured review), as they wrote them: the stars they gave, the
 * store's one-line summary, their name and where they said it, beside their own photo of what they got with the
 * product named and linked. Shown only when the owner has filled it in.
 */
export function FeaturedReview({ lang, settings, products }: { lang: Lang; settings: Settings; products: Product[] }) {
  const review = settings.home.review;
  if (!review.enabled || !review.text || !review.name) return null;
  const d = t(lang);
  const product = products.find((p) => p.id === review.productId);
  const title = review.title[lang];

  return (
    <section aria-label={title || review.name} className="grid overflow-hidden rounded-xl bg-footer text-fg-footer lg:grid-cols-2">
      <figure className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-14 sm:py-16">
        <span aria-hidden className="font-display text-[4.5rem] leading-[0.6] text-mustard-500">“</span>
        <span className="flex gap-1 text-mustard-500" role="img" aria-label={`${review.rating}/5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <StarIcon key={n} filled={n <= review.rating} className="size-5" />
          ))}
        </span>
        {title && <h2 className="text-h3 text-balance sm:text-h2">{title}</h2>}
        <blockquote className="max-w-xl text-body-lg whitespace-pre-line opacity-90">{review.text}</blockquote>
        <figcaption className="mt-2 flex flex-col items-center gap-3">
          {review.avatar ? (
            <img {...sized(review.avatar, "64px")} alt="" loading="lazy" className="size-16 rounded-full border-2 border-fg-footer/80 object-cover" />
          ) : (
            <span aria-hidden className="grid size-16 place-items-center rounded-full border-2 border-fg-footer/60 font-display text-h4">
              {review.name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("")}
            </span>
          )}
          <span className="font-semibold">
            {review.name}
            {review.source && ` · ${d.reviewFrom.replace("{source}", review.source)}`}
          </span>
        </figcaption>
      </figure>
      {review.photo && (
        <div className="relative min-h-72">
          <img {...sized(review.photo, "(min-width: 1024px) 50vw, 100vw")} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          {product && (
            <Link href={`/${lang}/p/${product.slug}`} className="absolute bottom-5 left-5 rounded-full bg-surface px-4 py-2 font-display text-label-md text-fg-primary shadow-card hover:text-fg-brand">
              {product.name[lang]}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
