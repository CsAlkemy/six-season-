"use server";

import { accessibleOrders, currentCustomer } from "@/lib/customers";
import { loadProducts } from "@/lib/data";
import { notifyReview } from "@/lib/notify";
import { loadReview, phoneHint, reviewId, saveReview } from "@/lib/reviews";
import { smsEnabled } from "@/lib/sms";
import type { Order, Review, ReviewStatus } from "@/lib/types";

/**
 * What the review box shows. The product page is static, so it asks for this once it loads:
 * "login" for a guest with no order of it here (`sms` says whether they can log in with a code, or should look the
 * order up by its number), "notBought" until an order with the product is delivered, "can" to write one, "sent" once
 * theirs is waiting or published.
 */
export type ReviewState =
  | { state: "login"; sms: boolean }
  | { state: "notBought" }
  | { state: "can"; previous: { rating: number; text: string } | null }
  | { state: "sent"; status: Exclude<ReviewStatus, "rejected"> };

export type ReviewError = "errRating" | "errReviewShort" | "errTooLong" | "errSave" | "errVerify";

const MIN_TEXT = 10;
const MAX_TEXT = 1000;

const hasProduct = (order: Order, productId: string) => order.items.some((item) => item.productId === productId);

/**
 * The newest delivered order with this product that this visitor may open (signed in, or from this device): the
 * proof they're a buyer. The review is filed under the signed-in number, else under the number on that order.
 */
async function buyer(productId: string) {
  const customer = await currentCustomer();
  const phone = customer?.phone ?? null;
  const orders = await accessibleOrders(customer);
  const order = orders.find((o) => o.status === "delivered" && hasProduct(o, productId));
  return { customer, phone, orders, order, reviewer: phone ?? order?.customer.phone ?? null };
}

export async function reviewState(productId: string): Promise<ReviewState> {
  const id = String(productId);
  const { phone, orders, order, reviewer } = await buyer(id);
  const existing = reviewer ? await loadReview(id, await reviewId(reviewer)).catch(() => null) : null;
  if (existing && existing.status !== "rejected") return { state: "sent", status: existing.status };
  if (!order) {
    // An order of it on its way: they're a buyer, just not yet one who has it.
    const coming = orders.some((o) => o.status !== "cancelled" && hasProduct(o, id));
    return phone || coming ? { state: "notBought" } : { state: "login", sms: smsEnabled() };
  }
  return { state: "can", previous: existing ? { rating: existing.rating, text: existing.text } : null };
}

/** Saves a buyer's review as pending; an admin approves it before the store shows it. */
export async function submitReview(input: { productId: string; rating: number; text: string }): Promise<{ ok: true } | { ok: false; error: ReviewError }> {
  const rating = Math.round(Number(input?.rating));
  const text = String(input?.text ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "errRating" };
  if (text.length < MIN_TEXT) return { ok: false, error: "errReviewShort" };
  if (text.length > MAX_TEXT) return { ok: false, error: "errTooLong" };

  const productId = String(input.productId);
  const product = (await loadProducts()).find((p) => p.id === productId);
  if (!product) return { ok: false, error: "errSave" };
  const { phone, order, reviewer, customer } = await buyer(productId);
  if (!order || !reviewer) return { ok: false, error: "errVerify" };

  const id = await reviewId(reviewer);
  const existing = await loadReview(productId, id).catch(() => null);
  // A published review stays as approved; a pending one can be rewritten, a rejected one replaced.
  if (existing?.status === "approved") return { ok: false, error: "errSave" };

  const review: Review = {
    id,
    productId,
    name: customer?.name || order.customer.name,
    rating,
    text,
    status: "pending",
    createdAt: new Date().toISOString(),
    orderNo: order.no,
    phoneHint: phoneHint(reviewer),
    reply: null,
  };
  try {
    await saveReview(review);
  } catch (error) {
    console.error("submitReview", error);
    return { ok: false, error: "errSave" };
  }
  notifyReview(review, product.name.en);
  return { ok: true };
}
