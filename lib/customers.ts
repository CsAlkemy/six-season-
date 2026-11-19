import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

import { readAllJson, readJson, writeJson } from "./blob";
import { loadOrder, orderIdsByNo } from "./data";
import { createCustomerSession, CUSTOMER_COOKIE, CUSTOMER_DAYS, sign, verifyCustomerSession } from "./session";
import { sendSms, smsEnabled } from "./sms";
import { withinLimit } from "./throttle";
import type { Customer, Lang, Order } from "./types";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;

/**
 * The Blob store is public, so customer files sit under a keyed hash of the phone:
 * nobody can find someone's account or code from their number alone.
 */
const keyOf = async (phone: string) => (await sign(`path:${phone}`)).slice(0, 32);
const customerPath = async (phone: string) => `customers/${await keyOf(phone)}.json`;
const ordersPrefix = async (phone: string) => `customers/${await keyOf(phone)}/orders/`;
const otpPath = async (phone: string) => `otp/${await keyOf(phone)}.json`;

export const loadCustomer = async (phone: string) => readJson<Customer>(await customerPath(phone));
export const saveCustomer = async (customer: Customer) => writeJson(await customerPath(customer.phone), customer);

export const newCustomer = (phone: string): Customer => ({
  phone,
  name: "",
  address: "",
  password: null,
  createdAt: new Date().toISOString(),
});

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await scryptAsync(password, salt, 32)).toString("hex")}`;
}

export async function passwordValid(password: string, stored: string | null): Promise<boolean> {
  const [salt, hash] = stored?.split(":") ?? [];
  if (!salt || !hash) return false;
  return timingSafeEqual(await scryptAsync(password, Buffer.from(salt, "hex"), 32), Buffer.from(hash, "hex"));
}

/* One-time codes */

interface OtpRecord {
  /** Keyed hash of the code, never the code itself. */
  hash: string;
  expires: number;
  attempts: number;
  /** Send times in the last hour, for the rate limit. */
  sends: number[];
}

const OTP_MINUTES = 5;
const OTP_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const SENDS_PER_HOUR = 5;

const otpHash = (phone: string, code: string) => sign(`otp:${phone}:${code}`);

export type SendResult = "ok" | "wait" | "sms";

export async function sendOtp(phone: string, lang: Lang): Promise<SendResult> {
  if (!smsEnabled()) return "sms";
  const path = await otpPath(phone);
  const now = Date.now();
  const sends = ((await readJson<OtpRecord>(path))?.sends ?? []).filter((at) => now - at < 3_600_000);
  if (sends.length >= SENDS_PER_HOUR || now - (sends.at(-1) ?? 0) < RESEND_SECONDS * 1000) return "wait";

  const code = String(randomInt(100_000, 1_000_000));
  await writeJson(path, { hash: await otpHash(phone, code), expires: now + OTP_MINUTES * 60_000, attempts: 0, sends: [...sends, now] } satisfies OtpRecord);

  const message =
    lang === "bn"
      ? `মাটির টান: আপনার কোড ${code}। ${OTP_MINUTES} মিনিট পর্যন্ত কাজ করবে। কাউকে জানাবেন না।`
      : `Matir Taan: your code is ${code}. It works for ${OTP_MINUTES} minutes. Don't share it.`;
  return (await sendSms(phone, message)) ? "ok" : "sms";
}

export type CheckResult = "ok" | "wrong" | "expired";

/** A code works once; after too many wrong tries the shopper has to ask for a new one. */
export async function checkOtp(phone: string, code: string): Promise<CheckResult> {
  const path = await otpPath(phone);
  const record = await readJson<OtpRecord>(path);
  if (!record?.hash || record.expires < Date.now() || record.attempts >= OTP_ATTEMPTS) return "expired";
  if ((await otpHash(phone, code.trim())) !== record.hash) {
    await writeJson(path, { ...record, attempts: record.attempts + 1 });
    return record.attempts + 1 >= OTP_ATTEMPTS ? "expired" : "wrong";
  }
  await writeJson(path, { ...record, hash: "", expires: 0 });
  return "ok";
}

/* Accounts */

/** Proven theirs by an SMS code or a WhatsApp reset link; older accounts with a password were (only codes made them). */
export const numberProven = (customer: Customer) => customer.phoneVerified ?? Boolean(customer.password);

/** An account (a password set), not just a guest's saved details. */
export const isAccount = (customer: Customer | null): customer is Customer & { password: string } => Boolean(customer?.password);

const MAX_CLAIMED = 50;

/** Adds orders to what an unproven account may see. Proven accounts see every order on their number already. */
export async function claimOrders(customer: Customer, ids: string[]): Promise<Customer> {
  const fresh = ids.filter((id) => ORDER_ID.test(id) && !customer.claimed?.includes(id));
  if (!fresh.length || numberProven(customer)) return customer;
  const updated = { ...customer, claimed: [...fresh, ...(customer.claimed ?? [])].slice(0, MAX_CLAIMED) };
  await saveCustomer(updated);
  return updated;
}

/* Session */

/** Changes with the password, so a new password signs every other device out. */
const printOf = async (customer: Customer) => (customer.password ? (await sign(`print:${customer.password}`)).slice(0, 12) : "");

/**
 * Signs the shopper in. This browser's guest orders on the same number become the account's (they were placed here);
 * others are forgotten, since on a shared phone they're someone else's.
 */
export async function startSession(customer: Customer): Promise<void> {
  const device = await deviceOrderIds();
  if (device.length) {
    const orders = await Promise.all(device.map((id) => loadOrder(id).catch(() => null)));
    const mine = orders.filter((o) => o?.customer.phone === customer.phone).map((o) => o!.id);
    if (mine.length) await claimOrders((await loadCustomer(customer.phone)) ?? customer, mine).catch((error) => console.error("startSession: claim", error));
  }
  await forgetDeviceOrders();
  (await cookies()).set(CUSTOMER_COOKIE, await createCustomerSession(customer.phone, await printOf(customer)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

/** The signed-in shopper, or null. A session from before the account's current password no longer counts. */
export async function currentCustomer(): Promise<Customer | null> {
  const session = await verifyCustomerSession((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!session) return null;
  const customer = (await loadCustomer(session.phone)) ?? newCustomer(session.phone);
  return (await printOf(customer)) === session.print ? customer : null;
}

export async function currentPhone(): Promise<string | null> {
  return (await currentCustomer())?.phone ?? null;
}

/* Password reset links: emailed, or sent by the team on WhatsApp to the account's own number. */

interface ResetRecord {
  phone: string;
  /** WhatsApp goes to the number itself, so opening it proves the number; email doesn't. */
  via: "email" | "whatsapp";
  lang: Lang;
  expires: number;
  used: boolean;
}

export const RESET_COOKIE = "mt_reset";
const resetPath = async (token: string) => `resets/${(await sign(`reset:${token}`)).slice(0, 32)}.json`;

/** A one-time link token; only its keyed hash is stored. */
export async function createReset(phone: string, via: ResetRecord["via"], lang: Lang, minutes: number): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await writeJson(await resetPath(token), { phone, via, lang, expires: Date.now() + minutes * 60_000, used: false } satisfies ResetRecord);
  return token;
}

export async function openReset(token: string | undefined): Promise<ResetRecord | null> {
  if (!token || !/^[\w-]{20,64}$/.test(token)) return null;
  const record = await readJson<ResetRecord>(await resetPath(token)).catch(() => null);
  return record && !record.used && record.expires > Date.now() ? record : null;
}

export async function spendReset(token: string): Promise<void> {
  const path = await resetPath(token);
  const record = await readJson<ResetRecord>(path);
  if (record) await writeJson(path, { ...record, used: true });
}

/* Orders */

/** A pointer per order under the customer, so their history is one listing instead of a scan of every order. */
export async function linkOrder(order: Order): Promise<void> {
  await writeJson(`${await ordersPrefix(order.customer.phone)}${order.id}.json`, { id: order.id });
}

/** Newest first (order ids sort that way). Loaded fresh so status changes show at once. */
export async function listCustomerOrders(phone: string): Promise<Order[]> {
  const { items } = await readAllJson<{ id: string }>(await ordersPrefix(phone), 50);
  const orders = await Promise.all(items.map((item) => loadOrder(item.id)));
  return orders.filter((order): order is Order => order?.customer.phone === phone);
}

/*
 * Orders from this device. Without a code nobody proves they own a number, so a guest's order is theirs to see only
 * from the browser that placed it (a signed cookie of order ids), or after giving its number and the mobile on it.
 */

const DEVICE_COOKIE = "mt_orders";
const DEVICE_DAYS = 180;
const DEVICE_MAX = 20;
const ORDER_ID = /^\d{13}-MT-\d{6}-\d{4}-[\da-f-]{12}$/;

async function deviceOrderIds(): Promise<string[]> {
  const parts = (await cookies()).get(DEVICE_COOKIE)?.value?.split(".") ?? [];
  const mac = parts.pop();
  if (!mac || !parts.length || parts.some((id) => !ORDER_ID.test(id))) return [];
  return (await sign(`orders:${parts.join(".")}`)) === mac ? parts : [];
}

/** Lets this browser open the order: after a guest checkout, or once its number and mobile were given. */
export async function rememberOrder(id: string): Promise<void> {
  if (!ORDER_ID.test(id)) return;
  const ids = [id, ...(await deviceOrderIds()).filter((other) => other !== id)].slice(0, DEVICE_MAX);
  (await cookies()).set(DEVICE_COOKIE, `${ids.join(".")}.${await sign(`orders:${ids.join(".")}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_DAYS * 86_400,
  });
}

/** Logging out forgets them too, as on a shared phone the next person shouldn't see them. */
export async function forgetDeviceOrders(): Promise<void> {
  (await cookies()).delete(DEVICE_COOKIE);
}

/**
 * What this visitor may open, newest first: this device's orders, and for a signed-in shopper their account's. A
 * proven number sees every order placed with it; an unproven one (an account made without a code) only those placed
 * while signed in to it and those it proved (placed on this browser, or found by number and mobile), so registering
 * someone else's number shows nothing of theirs.
 */
export async function accessibleOrders(customer: Customer | null): Promise<Order[]> {
  const load = (ids: string[]) => Promise.all(ids.map((id) => loadOrder(id).catch(() => null)));
  const [linked, claimed, device] = await Promise.all([
    customer ? listCustomerOrders(customer.phone).catch(() => [] as Order[]) : ([] as Order[]),
    customer && !numberProven(customer) ? load(customer.claimed ?? []) : Promise.resolve([] as (Order | null)[]),
    deviceOrderIds().then(load),
  ]);
  const own = customer && !numberProven(customer) ? linked.filter((o) => o.viaAccount) : linked;
  const all = new Map<string, Order>();
  for (const order of [...own, ...claimed, ...device]) if (order) all.set(order.id, order);
  return [...all.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Lookups allowed per mobile number per day, found or not: enough for a customer and their typos. With 9,000 order
 * numbers a day, someone who knows a number but not the order would need years.
 */
const TRACK_TRIES = 10;

export type FindResult = { ok: true; order: Order } | { ok: false; error: "errTrack" | "errTrackWait" };

/** The order with this number placed with this mobile (both already normalised). */
export async function findOrderByNo(no: string, phone: string): Promise<FindResult> {
  if (!(await withinLimit("track", phone, TRACK_TRIES, 86_400_000))) return { ok: false, error: "errTrackWait" };
  const orders = await Promise.all((await orderIdsByNo(no)).map((id) => loadOrder(id).catch(() => null)));
  const order = orders.find((o) => o?.no === no && o.customer.phone === phone);
  return order ? { ok: true, order } : { ok: false, error: "errTrack" };
}
