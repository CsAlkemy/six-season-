import { createHash, timingSafeEqual } from "node:crypto";

import { loadAccounts } from "@/lib/couriers";
import { num } from "@/lib/couriers/http";
import { stageOf } from "@/lib/couriers/meta";
import { PATHAO_WEBHOOK_REPLY } from "@/lib/couriers/pathao";
import { loadOrder, orderIdsByNo } from "@/lib/data";
import { orderForParcel, type ParcelNews, recordNews } from "@/lib/shipping";
import { COURIERS, type CourierId, type Order } from "@/lib/types";

/**
 * Parcel news pushed by the couriers, at /api/couriers/steadfast, /pathao and /carrybee. The URL and secret to paste
 * into each courier's panel are on Admin › Settings › Couriers. Each courier proves itself its own way:
 *   Steadfast  "Authorization: Bearer <token>", answered 200 with JSON.
 *   Pathao     "X-PATHAO-Signature: <secret>", answered 202 with Pathao's integration header (its panel checks both).
 *   CarryBee   "X-CB-Webhook-Integration-Header: <secret>", answered 202 with that same header sent back.
 * Updates for parcels this store doesn't know are acknowledged and dropped, so the courier doesn't keep retrying them.
 */

/** Compares secrets without leaking their length or content through timing. */
function same(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

/** Steadfast and Pathao write "2026-11-19 15:09:21" in Dhaka time. */
function when(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const iso = /^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/.test(raw) ? `${raw.replace(" ", "T")}+06:00` : raw;
  return Number.isNaN(Date.parse(iso)) ? undefined : new Date(iso).toISOString();
}

/** The order for a parcel: by its index, else by the invoice it was booked under (the order number, maybe with "-2"). */
async function findOrder(courier: CourierId, consignmentId: string, invoice: string): Promise<Order | null> {
  if (consignmentId) {
    const order = await orderForParcel(courier, consignmentId);
    if (order) return order;
  }
  const no = /^(MT-\d{6}-\d{4})/.exec(invoice)?.[1];
  if (!no) return null;
  for (const id of await orderIdsByNo(no)) {
    const order = await loadOrder(id).catch(() => null);
    if (order?.shipment?.courier === courier && (order.shipment.consignmentId === consignmentId || (!consignmentId && order.shipment.invoice === invoice))) return order;
  }
  return null;
}

async function apply(courier: CourierId, consignmentId: string, invoice: string, news: Omit<ParcelNews, "current">) {
  const order = await findOrder(courier, consignmentId, invoice);
  if (!order) {
    console.warn(`webhook ${courier}: no order for parcel ${consignmentId || invoice}`);
    return;
  }
  await recordNews(order, { ...news, current: false });
}

export async function POST(request: Request, ctx: RouteContext<"/api/couriers/[courier]">) {
  const asked = (await ctx.params).courier;
  const courier = COURIERS.find((c) => c === asked);
  if (!courier) return Response.json({ message: "Unknown courier" }, { status: 404 });

  const accounts = await loadAccounts().catch(() => null);
  const raw = (await request.text()).slice(0, 100_000);
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {}

  const headers = request.headers;
  try {
    if (courier === "steadfast") {
      const token = headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
      if (!same(token, accounts?.steadfast?.webhookToken)) return Response.json({ status: "error", message: "Unauthorized" }, { status: 401 });
      const type = text(body.notification_type) || "delivery_status";
      const consignmentId = text(body.consignment_id) || text(body.tracking_code);
      const status = text(body.status).toLowerCase();
      if (type === "delivery_status" && status) {
        await apply(courier, consignmentId, text(body.invoice), { status, stage: stageOf(courier, status), note: text(body.tracking_message) || undefined, fee: num(body.delivery_charge), at: when(body.updated_at) });
      } else if (type === "tracking_update" && text(body.tracking_message)) {
        // A line of news without a new status: kept with the parcel's history.
        const order = await findOrder(courier, consignmentId, text(body.invoice));
        if (order?.shipment) await recordNews(order, { status: order.shipment.status, stage: null, note: text(body.tracking_message), at: when(body.updated_at), current: false });
      }
      return Response.json({ status: "success", message: "Webhook received" });
    }

    if (courier === "pathao") {
      const reply = (status = 202) => Response.json({ message: status === 202 ? "Event received" : "Unauthorized" }, { status, headers: { [PATHAO_WEBHOOK_REPLY.header]: PATHAO_WEBHOOK_REPLY.value } });
      if (!same(headers.get("x-pathao-signature"), accounts?.pathao?.webhookSecret)) return reply(401);
      const event = text(body.event);
      if (event.startsWith("order.")) {
        const word = text(body.order_status_slug) || text(body.order_status);
        const status = event.replace(/^order\./, "");
        await apply(courier, text(body.consignment_id), text(body.merchant_order_id), {
          status,
          stage: stageOf(courier, status) ?? (word ? stageOf(courier, word) : null),
          note: text(body.reason) || undefined,
          fee: num(body.delivery_fee),
          at: text(body.timestamp) || when(body.updated_at),
        });
      }
      // "webhook_integration" (Pathao's check when the URL is saved) and store events need only the answer.
      return reply();
    }

    const secret = headers.get("x-cb-webhook-integration-header");
    const reply = (status = 202) => Response.json({ message: status === 202 ? "Event received" : "Unauthorized" }, { status, headers: status === 202 && secret ? { "X-CB-Webhook-Integration-Header": secret } : {} });
    if (!same(secret, accounts?.carrybee?.webhookSecret)) return reply(401);
    const event = text(body.event);
    if (event.startsWith("order.")) {
      const status = event.replace(/^order\./, "");
      await apply(courier, text(body.consignment_id), text(body.merchant_order_id), {
        status,
        stage: stageOf(courier, status),
        note: [text(body.reason), text(body.remarks)].filter(Boolean).join(" · ") || undefined,
        fee: num(body.delivery_fee),
        at: text(body.timestamptz) || undefined,
      });
    }
    return reply();
  } catch (error) {
    // Saving failed: a 5xx makes the courier send it again later.
    console.error(`webhook ${courier}`, error);
    return Response.json({ message: "Try again" }, { status: 500 });
  }
}

/** Opening the URL in a browser shows it's reachable, before pasting it into the courier's panel. */
export async function GET(_request: Request, ctx: RouteContext<"/api/couriers/[courier]">) {
  const asked = (await ctx.params).courier;
  const courier = COURIERS.find((c) => c === asked);
  return Response.json(courier ? { ok: true, courier, note: "Couriers send parcel updates here with POST." } : { ok: false }, { status: courier ? 200 : 404 });
}
