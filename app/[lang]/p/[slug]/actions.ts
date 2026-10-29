"use server";

import { currentCustomer, listCustomerOrders } from "@/lib/customers";
import { loadProducts } from "@/lib/data";
import { loadReview, phoneHint, reviewId, saveReview } from "@/lib/reviews";
import type { Customer, Order, Review, ReviewStatus } from "@/lib/types";

/**
 * What the review box shows. The product page is static, so it asks for this once it loads:
 * "login" for guests, "notBought" until an order with the product is delivered, "can" to write one,
 * "sent" once theirs is waiting or published.
 */
export type ReviewState =
  | { state: "login" }
  | { state: "notBought" }
  | { state: "can"; previous: { rating: number; text: string } | null }
  | { state: "sent"; status: Exclude<ReviewStatus, "rejected"> };

export type ReviewError = "errRating" | "errReviewShort" | "errTooLong" | "errSave" | "errVerify";

const MIN_TEXT = 10;
const MAX_TEXT = 1000;

/** The newest delivered order with this product in it: the proof the shopper is a buyer. */
async function deliveredOrder(customer: Customer, productId: string): Promise<Order | undefined> {
  const orders = await listCustomerOrders(customer.phone).catch(() => []);
  return orders.find((o) => o.status === "delivered" && o.items.some((item) => item.productId === productId));
}

export async function reviewState(productId: string): Promise<ReviewState> {
  const customer = await currentCustomer();
  if (!customer) return { state: "login" };
  const existing = await loadReview(String(productId), await reviewId(customer.phone)).catch(() => null);
  if (existing && existing.status !== "rejected") return { state: "sent", status: existing.status };
  if (!(await deliveredOrder(customer, String(productId)))) return { state: "notBought" };
  return { state: "can", previous: existing ? { rating: existing.rating, text: existing.text } : null };
}

/** Saves a buyer's review as pending; an admin approves it before the store shows it. */
export async function submitReview(input: { productId: string; rating: number; text: string }): Promise<{ ok: true } | { ok: false; error: ReviewError }> {
  const rating = Math.round(Number(input?.rating));
  const text = String(input?.text ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "errRating" };
  if (text.length < MIN_TEXT) return { ok: false, error: "errReviewShort" };
  if (text.length > MAX_TEXT) return { ok: false, error: "errTooLong" };

  const customer = await currentCustomer();
  if (!customer) return { ok: false, error: "errVerify" };
  const productId = String(input.productId);
  if (!(await loadProducts()).some((p) => p.id === productId)) return { ok: false, error: "errSave" };

  const id = await reviewId(customer.phone);
  const existing = await loadReview(productId, id).catch(() => null);
  // A published review stays as approved; a pending one can be rewritten, a rejected one replaced.
  if (existing?.status === "approved") return { ok: false, error: "errSave" };
  const order = await deliveredOrder(customer, productId);
  if (!order) return { ok: false, error: "errVerify" };

  const review: Review = {
    id,
    productId,
    name: customer.name || order.customer.name,
    rating,
    text,
    status: "pending",
    createdAt: new Date().toISOString(),
    orderNo: order.no,
    phoneHint: phoneHint(customer.phone),
    reply: null,
  };
  try {
    await saveReview(review);
  } catch (error) {
    console.error("submitReview", error);
    return { ok: false, error: "errSave" };
  }
  return { ok: true };
}
