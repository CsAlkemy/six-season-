import { unstable_cache } from "next/cache";

import { readAllJson, readJson, writeJson } from "./blob";
import { sign } from "./session";
import type { Review } from "./types";

/** Product pages are static; approving, rejecting or replying expires this tag. */
export const REVIEWS_TAG = "reviews";

const MAX = 1000;
const reviewPath = (productId: string, id: string) => `reviews/${productId}/${id}.json`;

/** One file per customer per product, named by a keyed hash so the public Blob URL gives away no number. */
export const reviewId = async (phone: string) => (await sign(`review:${phone}`)).slice(0, 24);

export const loadReview = (productId: string, id: string) => readJson<Review>(reviewPath(productId, id));
export const saveReview = (review: Review) => writeJson(reviewPath(review.productId, review.id), review);

const newestFirst = (a: Review, b: Review) => b.createdAt.localeCompare(a.createdAt);

/** Every review of every product, for the admin. */
export async function listAllReviews(): Promise<Review[]> {
  return (await readAllJson<Review>("reviews/", MAX)).items.sort(newestFirst);
}

async function loadApproved(productId: string): Promise<Review[]> {
  const { items } = await readAllJson<Review>(`reviews/${productId}/`, MAX);
  return items.filter((r) => r.status === "approved").sort(newestFirst);
}

/** What the product page shows. */
export const getApprovedReviews = unstable_cache(loadApproved, ["approved-reviews"], { tags: [REVIEWS_TAG], revalidate: 3600 });

export interface RatingSummary {
  average: number;
  count: number;
  /** How many reviews gave 5, 4, 3, 2 and 1 stars, in that order. */
  byStars: number[];
}

export function summarize(reviews: Review[]): RatingSummary {
  const byStars = [5, 4, 3, 2, 1].map((stars) => reviews.filter((r) => r.rating === stars).length);
  const count = reviews.length;
  const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  return { average, count, byStars };
}

/** "017•••••821". */
export const phoneHint = (phone: string) => `${phone.slice(0, 3)}${"•".repeat(Math.max(0, phone.length - 6))}${phone.slice(-3)}`;
