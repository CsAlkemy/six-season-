import type { CourierId, Shipment, ShipmentStage, Text } from "../types";

/** What the admin and the account page need to know about each courier. No keys and nothing server-only here. */

export const COURIER_NAME: Record<CourierId, Text> = {
  steadfast: { bn: "স্টেডফাস্ট", en: "Steadfast" },
  pathao: { bn: "পাঠাও", en: "Pathao" },
  carrybee: { bn: "ক্যারিবি", en: "CarryBee" },
};

/** The admin's words for each stage, and its pill colour. */
export const STAGE_LABEL: Record<ShipmentStage, string> = {
  booked: "Waiting for pickup",
  in_transit: "On the way",
  issue: "Needs attention",
  delivered: "Delivered",
  partial: "Partly delivered",
  returning: "Being returned",
  returned: "Returned to you",
  cancelled: "Cancelled",
};

export const STAGE_TONE: Record<ShipmentStage, "success" | "pending" | "failed" | "neutral" | "info"> = {
  booked: "pending",
  in_transit: "info",
  issue: "failed",
  delivered: "success",
  partial: "pending",
  returning: "failed",
  returned: "neutral",
  cancelled: "neutral",
};

/** Stages after which the courier has nothing more to say, so status checks stop. */
export const FINAL_STAGES: readonly ShipmentStage[] = ["delivered", "partial", "returned", "cancelled"];
/** The parcel isn't going to reach the customer: the order can be cancelled (its stock goes back) or booked again. */
export const FAILED_STAGES: readonly ShipmentStage[] = ["returning", "returned", "cancelled"];

/** A parcel still going to the customer, or already delivered: the order can't be booked again while it has one. */
export const isActive = (shipment: Shipment | undefined): shipment is Shipment => Boolean(shipment) && !FAILED_STAGES.includes(shipment!.stage);

/**
 * Reads a courier's status word, from its API or a webhook, into a stage. Pathao and CarryBee share their event names
 * ("order.picked", "order.received-at-last-mile-hub"…) and statuses ("Picked", "received_at_lmh"…); Steadfast has its
 * own ("in_review", "pending"…). Unknown words return null, so they're shown but don't move the parcel.
 */
export function stageOf(courier: CourierId, raw: string): ShipmentStage | null {
  const word = raw.trim().toLowerCase().replace(/^order\./, "").replace(/[\s-]+/g, "_");
  if (courier === "steadfast") {
    if (word === "in_review") return "booked";
    if (word === "pending") return "in_transit";
    if (word === "hold" || word.startsWith("unknown") || word === "exceptional") return "issue";
    if (word.startsWith("partial_delivered")) return "partial";
    if (word.startsWith("delivered")) return "delivered";
    if (word.startsWith("cancelled_return_received") || word.startsWith("partial_delivered_return_received")) return "returned";
    if (word.startsWith("cancelled")) return "returning";
    return null;
  }
  const map: Record<string, ShipmentStage> = {
    created: "booked",
    pending: "booked",
    pickup_requested: "booked",
    assigned_for_pickup: "booked",
    pickup_failed: "issue",
    pickup_cancelled: "cancelled",
    create_failed: "cancelled",
    picked: "in_transit",
    sorted: "in_transit",
    at_the_sorting_hub: "in_transit",
    on_the_way_to_central_warehouse: "in_transit",
    at_central_warehouse: "in_transit",
    in_transit: "in_transit",
    received_at_last_mile_hub: "in_transit",
    received_at_lmh: "in_transit",
    assigned_for_delivery: "in_transit",
    delivery_on_hold: "issue",
    on_hold: "issue",
    hold: "issue",
    delivery_failed: "issue",
    damaged: "issue",
    lost: "issue",
    exchange: "issue",
    exchanged: "issue",
    delivered: "delivered",
    partial_delivery: "partial",
    partial_delivered: "partial",
    return: "returning",
    returned: "returning",
    return_in_transit: "returning",
    returned_at_sorting: "returning",
    returned_in_transit: "returning",
    return_id_created: "returning",
    returned_to_merchant: "returned",
    paid_return: "returned",
    cancelled: "cancelled",
  };
  return map[word] ?? null;
}

/** A link the customer can follow the parcel on, where the courier has a public tracking page. */
export function trackingUrl(courier: CourierId, consignmentId: string, phone: string): string | undefined {
  const id = encodeURIComponent(consignmentId);
  if (courier === "carrybee") return `https://carrybee.com/track?consignmentId=${id}`;
  if (courier === "pathao") return `https://merchant.pathao.com/tracking?consignment_id=${id}&phone=${encodeURIComponent(phone)}`;
  // Steadfast's page wants a long token its API doesn't give, so a parcel there has no link of ours.
  return undefined;
}

/** What the settings page shows for one courier: never the keys themselves. */
export interface CourierView {
  id: CourierId;
  connected: boolean;
  /** Keys saved but unreadable (ADMIN_SECRET changed): connect again. */
  unreadable: boolean;
  /** "Api key ••••a1b2", the store's name… */
  summary: string[];
  sandbox: boolean;
  /** Which secret fields are already saved, so the form can say "leave empty to keep". */
  saved: string[];
  /** Non-secret fields, to fill the form back in. */
  fields: Record<string, string>;
  webhook: { url: string; secret: string };
}

export interface CourierDefaults {
  /** Picked first when booking; else the first connected. */
  courier: CourierId | "";
  /** A parcel's weight when the admin doesn't change it, in kg. */
  weightKg: number;
}

export interface CouriersView {
  couriers: CourierView[];
  defaults: CourierDefaults;
}

/** One place in a courier's address tree (city, zone, area). */
export interface Place {
  id: number;
  name: string;
}

/** A pickup store on the courier's side. Only an approved one can send parcels; a rejected one won't be approved by waiting. */
export type PickupStore = Place & { approved: boolean; rejected?: boolean };
