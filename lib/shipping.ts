import { readJson, writeJson } from "./blob";
import { type CourierAccounts, status as courierStatus } from "./couriers";
import { FINAL_STAGES } from "./couriers/meta";
import { loadOrder, saveOrder } from "./data";
import { notifyShipment } from "./notify";
import { withStatus } from "./orders";
import { sign } from "./session";
import type { CourierId, Order, Shipment, ShipmentStage } from "./types";

/**
 * Keeping an order in step with its parcel. Updates come from the courier's webhook, from "Refresh status", and when
 * the admin opens an order whose news is stale. The parcel's stage moves the order on: picked up → Shipped,
 * delivered → Delivered. Coming back or a problem never changes the order by itself; the team gets an email and decides.
 */

/** A webhook names the parcel by the courier's ID; this finds the order. Keyed-hash path, as the store is public. */
const indexPath = async (courier: CourierId, consignmentId: string) => `courier/${(await sign(`parcel:${courier}:${consignmentId}`)).slice(0, 32)}.json`;

export async function indexShipment(orderId: string, shipment: Pick<Shipment, "courier" | "consignmentId">): Promise<void> {
  await writeJson(await indexPath(shipment.courier, shipment.consignmentId), { id: orderId });
}

export async function orderForParcel(courier: CourierId, consignmentId: string): Promise<Order | null> {
  const entry = await readJson<{ id: string }>(await indexPath(courier, consignmentId)).catch(() => null);
  const order = entry?.id ? await loadOrder(entry.id).catch(() => null) : null;
  return order?.shipment?.courier === courier && order.shipment.consignmentId === consignmentId ? order : null;
}

/** How far along each stage is. A webhook that arrives late can't move a parcel back. */
const RANK: Record<ShipmentStage, number> = { booked: 0, in_transit: 1, issue: 1, returning: 2, delivered: 3, partial: 3, returned: 3, cancelled: 3 };

export interface ParcelNews {
  status: string;
  /** null: a word we don't know, shown but not acted on. */
  stage: ShipmentStage | null;
  at?: string;
  note?: string;
  fee?: number;
  /**
   * The courier's answer to "where is it now?" is the truth whatever came before. A webhook may arrive out of order,
   * so it can only move the parcel forward.
   */
  current: boolean;
}

export function applyNews(order: Order, news: ParcelNews): { order: Order; from: ShipmentStage; to: ShipmentStage; changed: boolean } {
  const shipment = order.shipment;
  if (!shipment) return { order, from: "booked", to: "booked", changed: false };
  const from = shipment.stage;
  let to = news.stage ?? from;
  if (!news.current && RANK[to] < RANK[from]) to = from;
  if (!news.current && FINAL_STAGES.includes(from) && to !== from) to = from;

  const at = news.at && !Number.isNaN(Date.parse(news.at)) ? new Date(news.at).toISOString() : new Date().toISOString();
  const events = shipment.events ?? [];
  const last = events.at(-1);
  // Couriers change case between calls ("Pending" when booked, "pending" when asked), so that isn't news.
  const fresh = last?.status.toLowerCase() !== news.status.toLowerCase() || (news.note && last?.note !== news.note);
  const next: Shipment = {
    ...shipment,
    status: news.status || shipment.status,
    stage: to,
    ...(news.fee !== undefined ? { fee: news.fee } : {}),
    updatedAt: new Date().toISOString(),
    events: fresh ? [...events, { at, status: news.status, ...(news.note ? { note: news.note.slice(0, 300) } : {}) }].slice(-30) : events,
  };

  let updated: Order = { ...order, shipment: next };
  if (to !== from) {
    // Picked up: it has left. Delivered: done (cash collected at the door). Steadfast never says it was picked up (its
    // "pending" covers before and after), so with Steadfast the team marks it shipped and delivery finishes it.
    const left = (to === "in_transit" && shipment.courier !== "steadfast") || to === "delivered" || to === "partial";
    if (left && (updated.status === "confirmed" || updated.status === "packing")) updated = withStatus(updated, "shipped");
    if (to === "delivered" && updated.status === "shipped") updated = withStatus(updated, "delivered");
  }
  return { order: updated, from, to, changed: Boolean(fresh) || to !== from || (news.fee !== undefined && news.fee !== shipment.fee) };
}

/**
 * Saves what changed and emails the team when the parcel reached a stage worth knowing about. The order is read again
 * first: the courier took a moment, and meanwhile the team may have cancelled it or another update may have landed.
 */
export async function recordNews(order: Order, news: ParcelNews): Promise<Order> {
  const latest = (await loadOrder(order.id)) ?? order;
  const parcel = order.shipment;
  if (!parcel || latest.shipment?.courier !== parcel.courier || latest.shipment.consignmentId !== parcel.consignmentId) return latest;
  const { order: updated, from, to, changed } = applyNews(latest, news);
  // A status check is remembered even when nothing changed, so the next open doesn't ask again straight away.
  if (!changed && !news.current) return latest;
  const saved: Order = news.current ? { ...updated, shipment: { ...updated.shipment!, checkedAt: new Date().toISOString() } } : updated;
  await saveOrder(saved);
  if (to !== from) notifyShipment(saved, from, to);
  return saved;
}

/** Asks the courier where the parcel is now. */
export async function syncShipment(order: Order, accounts: CourierAccounts): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  if (!order.shipment) return { ok: false, error: "This order has no parcel." };
  const r = await courierStatus(accounts, order.shipment);
  if (!r.ok) return r;
  return { ok: true, order: await recordNews(order, { status: r.value.status, stage: r.value.stage, fee: r.value.fee, note: r.value.note, current: true }) };
}
