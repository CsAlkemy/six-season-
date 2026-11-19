import { createHash } from "node:crypto";

import { readVault, writeVault } from "../vault";
import { type Place, stageOf } from "./meta";
import { type Booked, call, fail, messageOf, num, type Parcel, places, type Result, type StatusNow } from "./http";

/**
 * Pathao Courier merchant API (merchant.pathao.com › Developer API). Four things from the panel: client ID and secret,
 * and the merchant login's email and password, traded for an access token (90 days on the sandbox; its own expiry is
 * read each time). The token pair is kept in the vault and renewed when it runs out. Parcels go out from one of the
 * merchant's stores. For Bangladesh, Pathao works out the city and zone from the address; they're sent only when the
 * admin picks them, which is the fix when Pathao can't place an address.
 */

const BASE = { live: "https://api-hermes.pathao.com", sandbox: "https://courier-api-sandbox.pathao.com" };

export interface PathaoAccount {
  sandbox: boolean;
  clientId: string;
  clientSecret: string;
  /** The Pathao merchant login (email). */
  username: string;
  password: string;
  storeId: string;
  storeName: string;
  /** Pathao sends it in X-PATHAO-Signature on each update; the admin pastes it into the panel. */
  webhookSecret: string;
}

/** Pathao's answer to a webhook's integration check, from its docs: the endpoint must send this header back. */
export const PATHAO_WEBHOOK_REPLY = { header: "X-Pathao-Merchant-Webhook-Integration-Secret", value: "f3992ecc-59da-4cbe-a049-a13da2018d51" };

const url = (a: Pick<PathaoAccount, "sandbox">, path: string) => `${a.sandbox ? BASE.sandbox : BASE.live}/aladdin/api/v1${path}`;
/** Pathao's sandbox takes about 20 seconds to answer anything (live answers in well under one), so it gets 40. */
const patience = (a: Pick<PathaoAccount, "sandbox">, ms: number) => (a.sandbox ? Math.max(ms, 40_000) : ms);

interface Token {
  /** Which account it belongs to, so new keys never use an old token. */
  owner: string;
  access: string;
  expires: number;
}
const TOKEN = "pathao-token";
const ownerOf = (a: PathaoAccount) => createHash("sha256").update(`${a.sandbox}:${a.clientId}:${a.username}`).digest("hex").slice(0, 16);

const LOGIN = "Pathao didn't accept the login. Check the client ID and secret, the merchant email and password, and that Sandbox matches where they're from.";

function failure(status: number, body: Record<string, unknown> | null): { ok: false; error: string } {
  if (status === 401) return fail(LOGIN);
  const errors = body?.errors;
  if (status === 422 && errors && typeof errors === "object" && ("recipient_city" in errors || "recipient_zone" in errors)) {
    return fail("Pathao couldn't place this address. Pick the city and zone yourself, or add the area and district to the address.");
  }
  const message = messageOf(body);
  return fail(message ? `Pathao: ${message}` : `Pathao answered with error ${status}.`);
}

/**
 * A token for the account: the saved one, or a new one from the password once it runs out (weeks later). One login
 * rather than a refresh first, so a slow Pathao can't use up the page's time on two token calls before the real one.
 */
async function token(a: PathaoAccount, fresh = false): Promise<Result<string>> {
  const owner = ownerOf(a);
  const saved = fresh ? null : await readVault<Token>(TOKEN).catch(() => null);
  if (saved?.owner === owner && saved.expires > Date.now() + 60_000) return { ok: true, value: saved.access };

  const r = await call("pathao", url(a, "/issue-token"), {
    method: "POST",
    timeoutMs: patience(a, 25_000),
    body: JSON.stringify({ client_id: a.clientId, client_secret: a.clientSecret, grant_type: "password", username: a.username, password: a.password }),
  });
  if (!r.ok) return r;
  const { status, body } = r.value;
  // Wrong keys come back as 400 "The user credentials were incorrect".
  if (!body?.access_token) return status >= 500 ? failure(status, body) : fail(LOGIN);
  const next: Token = { owner, access: String(body.access_token), expires: Date.now() + (num(body.expires_in) ?? 3600) * 1000 };
  await writeVault(TOKEN, next).catch((error) => console.error("pathao: token", error));
  return { ok: true, value: next.access };
}

/** A call with the token; on a 401 the token is renewed from the password once and the call tried again. */
async function authed(a: PathaoAccount, path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  for (const fresh of [false, true]) {
    const t = await token(a, fresh);
    if (!t.ok) return t;
    const r = await call("pathao", url(a, path), { ...init, timeoutMs: patience(a, init.timeoutMs ?? 15_000), headers: { ...init.headers, Authorization: `Bearer ${t.value}` } });
    if (!r.ok || r.value.status !== 401 || fresh) return r;
  }
  return fail("Pathao didn't accept the login.");
}

const inner = (body: Record<string, unknown> | null) => (body?.data ?? null) as Record<string, unknown> | null;

/** Checks the login and lists the merchant's stores, to pick the one parcels are picked up from. */
export async function check(a: PathaoAccount): Promise<Result<{ stores: (Place & { approved: boolean })[] }>> {
  const t = await token(a, true);
  if (!t.ok) return t;
  const r = await authed(a, "/stores");
  if (!r.ok) return r;
  const { status, body } = r.value;
  const list = inner(body)?.data;
  if (status !== 200 || !Array.isArray(list)) return failure(status, body);
  const stores = (list as Record<string, unknown>[]).flatMap((s) => {
    const id = num(s.store_id);
    return id === undefined ? [] : [{ id, name: String(s.store_name ?? `Store ${id}`), approved: s.is_active === undefined || Boolean(num(s.is_active) ?? s.is_active) }];
  });
  return { ok: true, value: { stores } };
}

export async function book(a: PathaoAccount, p: Parcel): Promise<Result<Booked>> {
  const r = await authed(a, "/orders", {
    method: "POST",
    timeoutMs: 25_000,
    body: JSON.stringify({
      store_id: Number(a.storeId),
      merchant_order_id: p.invoice,
      recipient_name: p.name.slice(0, 64),
      recipient_phone: p.phone,
      recipient_address: p.address.slice(0, 220),
      // Left out, Pathao reads them from the address.
      ...(p.cityId && p.zoneId ? { recipient_city: p.cityId, recipient_zone: p.zoneId } : {}),
      ...(p.cityId && p.zoneId && p.areaId ? { recipient_area: p.areaId } : {}),
      delivery_type: 48,
      item_type: 2,
      special_instruction: p.note.slice(0, 255),
      item_quantity: Math.max(1, p.quantity),
      item_weight: Math.min(10, Math.max(0.5, Math.round(p.weightKg * 10) / 10)),
      item_description: p.description.slice(0, 255),
      amount_to_collect: Math.round(p.cod),
    }),
  });
  if (!r.ok) return fail(`${r.error} Check the Pathao panel for order ${p.invoice} before trying again, so the parcel isn't booked twice.`);
  const { status, body } = r.value;
  const d = inner(body);
  if (status >= 200 && status < 300 && d?.consignment_id) {
    return { ok: true, value: { consignmentId: String(d.consignment_id), status: typeof d.order_status === "string" ? d.order_status : "Pending", fee: num(d.delivery_fee) } };
  }
  return failure(status, body);
}

export async function status(a: PathaoAccount, consignmentId: string): Promise<Result<StatusNow>> {
  const r = await authed(a, `/orders/${encodeURIComponent(consignmentId)}/info`);
  if (!r.ok) return r;
  const { status: code, body } = r.value;
  const d = inner(body);
  const word = typeof d?.order_status_slug === "string" && d.order_status_slug ? d.order_status_slug : typeof d?.order_status === "string" ? d.order_status : "";
  if (code === 404) return fail(`Pathao has no parcel ${consignmentId}.`);
  if (code !== 200 || !word) return failure(code, body);
  return { ok: true, value: { status: word, stage: stageOf("pathao", word) } };
}

/** Cities, the zones of a city, or the areas of a zone. */
export async function list(a: PathaoAccount, cityId?: number, zoneId?: number): Promise<Result<Place[]>> {
  const path = !cityId ? "/city-list" : !zoneId ? `/cities/${cityId}/zone-list` : `/zones/${zoneId}/area-list`;
  const r = await authed(a, path);
  if (!r.ok) return r;
  const { status, body } = r.value;
  const items = inner(body)?.data;
  if (status !== 200 || !Array.isArray(items)) return failure(status, body);
  const [id, name] = !cityId ? ["city_id", "city_name"] : !zoneId ? ["zone_id", "zone_name"] : ["area_id", "area_name"];
  return { ok: true, value: places(items, id, name) };
}
