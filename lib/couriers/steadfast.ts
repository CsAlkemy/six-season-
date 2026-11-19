import { stageOf } from "./meta";
import { type Booked, call, fail, messageOf, num, type Parcel, type Result, type StatusNow } from "./http";

/**
 * Steadfast Courier (steadfast.com.bd), API at portal.packzy.com. Two keys from the merchant panel's API section; no
 * sandbox, so every booking is a real parcel. About ten calls with wrong keys block the calling server for a while,
 * which is why keys are checked once, when they're saved.
 */

const BASE = "https://portal.packzy.com/api/v1";

export interface SteadfastAccount {
  apiKey: string;
  secretKey: string;
  /** Steadfast sends it as "Authorization: Bearer …" on each status update; the admin pastes it into the panel. */
  webhookToken: string;
}

const auth = (a: SteadfastAccount) => ({ "Api-Key": a.apiKey, "Secret-Key": a.secretKey });

function failure(status: number, body: Record<string, unknown> | null): { ok: false; error: string } {
  if (status === 401) return fail("Steadfast didn't accept the keys. Copy the API key and secret key again from the Steadfast panel, then save them in Settings › Couriers.");
  if (status === 429) return fail("Steadfast has paused this server for a while after too many tries with wrong keys. Wait an hour, then try again.");
  const message = messageOf(body);
  return fail(message ? `Steadfast: ${message}` : `Steadfast answered with error ${status}.`);
}

/** Checks the keys by reading the account balance. */
export async function check(a: SteadfastAccount): Promise<Result<{ balance: number }>> {
  const r = await call("steadfast", `${BASE}/get_balance`, { headers: auth(a) });
  if (!r.ok) return r;
  const { status, body } = r.value;
  if (status !== 200 || num(body?.status) !== 200) return failure(status, body);
  return { ok: true, value: { balance: num(body?.current_balance) ?? 0 } };
}

export async function book(a: SteadfastAccount, p: Parcel): Promise<Result<Booked>> {
  const r = await call("steadfast", `${BASE}/create_order`, {
    method: "POST",
    headers: auth(a),
    timeoutMs: 25_000,
    body: JSON.stringify({
      invoice: p.invoice,
      recipient_name: p.name.slice(0, 100),
      recipient_phone: p.phone,
      recipient_address: p.address.slice(0, 250),
      cod_amount: p.cod,
      note: p.note.slice(0, 480),
      item_description: p.description.slice(0, 255),
    }),
  });
  // It may have gone through before the line dropped: a second try would be a second parcel.
  if (!r.ok) return fail(`${r.error} Check the Steadfast panel for invoice ${p.invoice} before trying again, so the parcel isn't booked twice.`);
  const { status, body } = r.value;
  const consignment = body?.consignment as Record<string, unknown> | undefined;
  if (status === 200 && num(body?.status) === 200 && consignment?.consignment_id) {
    const link = typeof consignment.tracking_link === "string" && /^https:\/\/(www\.)?steadfast\.com\.bd\//.test(consignment.tracking_link) ? consignment.tracking_link : undefined;
    return {
      ok: true,
      value: {
        consignmentId: String(consignment.consignment_id),
        trackingCode: typeof consignment.tracking_code === "string" ? consignment.tracking_code : undefined,
        trackingUrl: link,
        status: typeof consignment.status === "string" ? consignment.status : "in_review",
      },
    };
  }
  const message = messageOf(body);
  if (/invoice/i.test(message) && /already|taken|exist/i.test(message)) {
    return fail(`Steadfast already has a parcel with invoice ${p.invoice}. If an earlier try went through, find it in the Steadfast panel and add its consignment ID with “Add tracking by hand”.`);
  }
  return failure(status, body);
}

export async function status(a: SteadfastAccount, consignmentId: string): Promise<Result<StatusNow>> {
  const r = await call("steadfast", `${BASE}/status_by_cid/${encodeURIComponent(consignmentId)}`, { headers: auth(a) });
  if (!r.ok) return r;
  const { status: code, body } = r.value;
  const word = typeof body?.delivery_status === "string" ? body.delivery_status : "";
  if (code !== 200 || !word) return code === 404 || num(body?.status) === 404 ? fail(`Steadfast has no parcel ${consignmentId}.`) : failure(code, body);
  return { ok: true, value: { status: word, stage: stageOf("steadfast", word) } };
}
