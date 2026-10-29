"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { type ReviewState, reviewState, submitReview } from "@/app/[lang]/p/[slug]/actions";
import type { Dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

import { StarIcon } from "./icons";

/**
 * Write-a-review box. The product page is static, so whether this shopper may review (signed in, and a
 * delivered order with this product) is asked for once it loads.
 */
export function ReviewBox({ productId, lang, d }: { productId: string; lang: Lang; d: Dict }) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    reviewState(productId)
      .then(setState)
      .catch(() => setState({ state: "login" }));
  }, [productId]);

  if (!state) return <div className="h-14 animate-pulse rounded-xl bg-muted" aria-hidden />;

  if (state.state === "login") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border p-5">
        <p className="text-body-sm text-fg-secondary">{d.reviewLogin}</p>
        <Link href={`/${lang}/account`} className="btn-secondary h-11 px-5 text-label-md">
          {d.login}
        </Link>
      </div>
    );
  }

  if (state.state === "notBought") {
    return <p className="rounded-xl border border-border p-5 text-body-sm text-fg-secondary">{d.reviewOnlyBuyers}</p>;
  }

  if (state.state === "sent") {
    return (
      <p className="rounded-xl bg-sage-soft p-5 text-body-sm font-medium text-fg-sage" role="status">
        {state.status === "approved" ? d.reviewPublished : d.reviewPending}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        {d.writeReview}
      </button>
    );
  }

  return <ReviewForm productId={productId} d={d} previous={state.previous} onSent={() => setState({ state: "sent", status: "pending" })} />;
}

function ReviewForm({ productId, d, previous, onSent }: { productId: string; d: Dict; previous: { rating: number; text: string } | null; onSent: () => void }) {
  const [rating, setRating] = useState(previous?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(previous?.text ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await submitReview({ productId, rating, text }).catch(() => null);
      if (result?.ok) onSent();
      else setError(d[result?.error ?? "errSave"]);
    });
  };

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-border p-5">
      <fieldset>
        <legend className="label">{d.yourRating}</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} onMouseEnter={() => setHover(n)} className="cursor-pointer rounded-md p-0.5 has-focus-visible:outline-2 has-focus-visible:outline-brand">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" aria-label={`${n} / 5`} />
              <StarIcon filled={n <= shown} className={`size-9 transition-colors ${n <= shown ? "text-mustard-500" : "text-border-strong"}`} />
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-text" className="label">{d.yourReview}</label>
        <textarea id="review-text" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} className="field" />
      </div>
      {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? d.sending : d.submitReview}</button>
      <p className="text-body-sm text-fg-tertiary">{d.reviewApprovalNote}</p>
    </form>
  );
}
