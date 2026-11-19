import { type Place, stageOf } from "./meta";
import { type Booked, call, fail, messageOf, num, type Parcel, places, type Result, type StatusNow } from "./http";

/**
 * CarryBee (carrybee.com) merchant API v2. Three keys from the merchant panel (Client ID, Client Secret, Client
 * Context) on every call; parcels go out from one of the merchant's pickup stores and need CarryBee's own city and zone
 * ids, which its address lookup can usually fill in from the typed address. Wrong keys come back as HTTP 500.
 */

const BASE = { live: "https://developers.carrybee.com", sandbox: "https://sandbox.carrybee.com" };

export interface CarrybeeAccount {
  sandbox: boolean;
  clientId: string;
  clientSecret: string;
  clientContext: string;
  storeId: string;
  storeName: string;
  /** CarryBee sends it back in X-CB-Webhook-Integration-Header; the admin pastes it into the panel. */
  webhookSecret: string;
}

const url = (a: Pick<CarrybeeAccount, "sandbox">, path: string) => `${a.sandbox ? BASE.sandbox : BASE.live}/api/v2${path}`;
const auth = (a: CarrybeeAccount) => ({ "Client-ID": a.clientId, "Client-Secret": a.clientSecret, "Client-Context": a.clientContext });
const data = (body: Record<string, unknown> | null) => (body?.data ?? null) as Record<string, unknown> | null;

function failure(status: number, body: Record<string, unknown> | null): { ok: false; error: string } {
  if (status === 401 || status === 403 || (status >= 500 && /unexpected error/i.test(String(body?.message ?? "")))) {
    return fail("CarryBee didn't accept the keys. Copy the Client ID, Client Secret and Client Context again from the CarryBee panel, and check Sandbox matches where they're from.");
  }
  const message = messageOf(body);
  return fail(message ? `CarryBee: ${message}` : `CarryBee answered with error ${status}.`);
}

/** Checks the keys by listing the pickup stores; CarryBee approves a store before it can send parcels. */
export async function check(a: CarrybeeAccount): Promise<Result<{ stores: (Place & { approved: boolean })[] }>> {
  const r = await call("carrybee", url(a, "/stores"), { headers: auth(a) });
  if (!r.ok) return r;
  const { status, body } = r.value;
  const list = data(body)?.stores;
  if (status !== 200 || body?.error === true || !Array.isArray(list)) return failure(status, body);
  const stores = (list as Record<string, unknown>[]).flatMap((s) => {
    const id = num(s.id);
    return id === undefined ? [] : [{ id, name: String(s.name ?? `Store ${id}`), approved: s.status === undefined || s.status === "approved" }];
  });
  return { ok: true, value: { stores } };
}

export async function book(a: CarrybeeAccount, p: Parcel): Promise<Result<Booked>> {
  if (!p.cityId || !p.zoneId) return fail("Pick the city and zone for CarryBee.");
  const r = await call("carrybee", url(a, "/orders"), {
    method: "POST",
    headers: auth(a),
    timeoutMs: 25_000,
    body: JSON.stringify({
      store_id: String(a.storeId),
      merchant_order_id: p.invoice.slice(0, 60),
      delivery_type: 1,
      product_type: 1,
      recipient_phone: p.phone,
      recipient_name: p.name.slice(0, 99),
      recipient_address: p.address.slice(0, 200),
      city_id: p.cityId,
      zone_id: p.zoneId,
      ...(p.areaId ? { area_id: p.areaId } : {}),
      special_instruction: p.note.slice(0, 255),
      product_description: p.description.slice(0, 255),
      item_weight: Math.min(25_000, Math.max(1, Math.round(p.weightKg * 1000))),
      item_quantity: Math.max(1, p.quantity),
      collectable_amount: Math.round(p.cod),
    }),
  });
  if (!r.ok) return fail(`${r.error} Check the CarryBee panel for order ${p.invoice} before trying again, so the parcel isn't booked twice.`);
  const { status, body } = r.value;
  const order = data(body)?.order as Record<string, unknown> | undefined;
  if (status >= 200 && status < 300 && body?.error !== true && order?.consignment_id) {
    return { ok: true, value: { consignmentId: String(order.consignment_id), status: "created", fee: num(order.delivery_fee) } };
  }
  return failure(status, body);
}

export async function status(a: CarrybeeAccount, consignmentId: string): Promise<Result<StatusNow>> {
  const r = await call("carrybee", url(a, `/orders/${encodeURIComponent(consignmentId)}/details`), { headers: auth(a) });
  if (!r.ok) return r;
  const { status: code, body } = r.value;
  const info = data(body);
  const word = typeof info?.transfer_status === "string" ? info.transfer_status : "";
  if (code === 404) return fail(`CarryBee has no parcel ${consignmentId}.`);
  if (code !== 200 || !word) return failure(code, body);
  return { ok: true, value: { status: word, stage: stageOf("carrybee", word), fee: num(info?.delivery_fee), note: typeof info?.reason === "string" && info.reason ? info.reason : undefined } };
}

/** CarryBee is the one courier here that takes a cancellation by API; it's processed in the background. */
export async function cancel(a: CarrybeeAccount, consignmentId: string, reason: string): Promise<Result<null>> {
  const r = await call("carrybee", url(a, `/orders/${encodeURIComponent(consignmentId)}/cancel`), {
    method: "POST",
    headers: auth(a),
    body: JSON.stringify({ cancellation_reason: (reason || "Cancelled by the store").slice(0, 190) }),
  });
  if (!r.ok) return r;
  const { status, body } = r.value;
  if (status >= 200 && status < 300 && body?.error !== true) return { ok: true, value: null };
  return failure(status, body);
}

/** Cities, the zones of a city, or the areas of a zone. */
export async function list(a: CarrybeeAccount, cityId?: number, zoneId?: number): Promise<Result<Place[]>> {
  const path = !cityId ? "/cities" : !zoneId ? `/cities/${cityId}/zones` : `/cities/${cityId}/zones/${zoneId}/areas`;
  const r = await call("carrybee", url(a, path), { headers: auth(a) });
  if (!r.ok) return r;
  const { status, body } = r.value;
  const d = data(body);
  const items = d?.cities ?? d?.zones ?? d?.areas;
  if (status !== 200 || !Array.isArray(items)) return failure(status, body);
  return { ok: true, value: places(items, "id", "name") };
}

/** CarryBee's guess at the city and zone of a typed address (it never guesses the area). */
export async function detect(a: CarrybeeAccount, address: string): Promise<Result<{ cityId: number; zoneId: number } | null>> {
  if (address.trim().length < 10) return { ok: true, value: null };
  const r = await call("carrybee", url(a, "/address-details"), { method: "POST", headers: auth(a), body: JSON.stringify({ query: address.slice(0, 300) }) });
  if (!r.ok) return r;
  const d = data(r.value.body);
  const cityId = num(d?.city_id);
  const zoneId = num(d?.zone_id);
  return { ok: true, value: cityId && zoneId ? { cityId, zoneId } : null };
}
