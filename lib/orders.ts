import { paymentIsCash } from "./payments";
import type { Order, OrderEvent, OrderStatus } from "./types";

/** The admin's words for each stage. The shopper sees their own (statusNew… in i18n). */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  packing: "Packing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** The pill colour for each stage: amber while it waits on you, green once delivered. */
export const STATUS_TONE: Record<OrderStatus, "success" | "pending" | "failed" | "neutral" | "info"> = {
  new: "pending",
  confirmed: "info",
  packing: "pending",
  shipped: "info",
  delivered: "success",
  cancelled: "neutral",
};

/**
 * Money counts once the parcel is at the customer's door (cash is collected then), so revenue is Delivered orders only.
 * Confirmed, Packing and Shipped are sold but still on the way; New is waiting for a yes; Cancelled is never money.
 */
export const IN_PROGRESS_STATUSES: readonly OrderStatus[] = ["confirmed", "packing", "shipped"];

/** When the order reached a stage; orders saved before the timeline fall back to the day they were placed. */
export function reachedAt(order: Order, status: OrderStatus): string {
  return [...historyOf(order)].reverse().find((event) => event.status === status && event.at)?.at ?? order.createdAt;
}

/** The one step forward from each stage, as the button names it. */
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "confirmed", label: "Confirm" },
  confirmed: { to: "packing", label: "Start packing" },
  packing: { to: "shipped", label: "Mark shipped" },
  shipped: { to: "delivered", label: "Mark delivered" },
};

/** Once it has left with the courier it can't be cancelled here. */
export const canCancel = (status: OrderStatus) => status === "new" || status === "confirmed" || status === "packing";

/** What happened so far; orders from before the timeline get their placing and current stage. */
export function historyOf(order: Order): OrderEvent[] {
  if (order.history?.length) return order.history;
  const placed: OrderEvent = { status: "new", at: order.createdAt };
  return order.status === "new" ? [placed] : [placed, { status: order.status, at: "" }];
}

/** Moves an order on, recording when. */
export const withStatus = (order: Order, status: OrderStatus, note?: string): Order => ({
  ...order,
  status,
  history: [...historyOf(order), { status, at: new Date().toISOString(), ...(note ? { note } : {}) }],
});

/** Where the money stands, for the payment card and the list. */
export function paymentState(order: Order): { label: string; tone: "ok" | "wait" | "off" } {
  if (paymentIsCash(order.payment)) {
    if (order.status === "delivered") return { label: "Collected", tone: "ok" };
    if (order.status === "cancelled") return { label: "Not collected", tone: "off" };
    return { label: "Due on delivery", tone: "wait" };
  }
  if (order.status === "new") return { label: "Check TrxID", tone: "wait" };
  if (order.status === "cancelled") return { label: "Refund if received", tone: "off" };
  return { label: "Paid", tone: "ok" };
}

export const dhakaTime = (iso: string, style: "date" | "datetime" = "datetime") =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    ...(style === "datetime" ? { timeStyle: "short" } : {}),
  });

export const itemCount = (order: Order) => order.items.reduce((sum, item) => sum + item.qty, 0);
