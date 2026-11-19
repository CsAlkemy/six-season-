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

/* Session */

export async function startSession(phone: string): Promise<void> {
  // Orders from this device may be someone else's (a shared phone); the account's own come with the number.
  await forgetDeviceOrders();
  (await cookies()).set(CUSTOMER_COOKIE, await createCustomerSession(phone), {
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

/** The signed-in shopper's verified phone, or null. */
export async function currentPhone(): Promise<string | null> {
  return verifyCustomerSession((await cookies()).get(CUSTOMER_COOKIE)?.value);
}

export async function currentCustomer(): Promise<Customer | null> {
  const phone = await currentPhone();
  if (!phone) return null;
  return (await loadCustomer(phone)) ?? newCustomer(phone);
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

/** What this visitor may open: the signed-in number's orders and this device's, newest first. */
export async function accessibleOrders(phone: string | null): Promise<Order[]> {
  const [mine, device] = await Promise.all([
    phone ? listCustomerOrders(phone).catch(() => [] as Order[]) : ([] as Order[]),
    deviceOrderIds().then((ids) => Promise.all(ids.map((id) => loadOrder(id).catch(() => null)))),
  ]);
  const seen = new Set(mine.map((order) => order.id));
  const others = device.filter((order): order is Order => Boolean(order) && !seen.has(order!.id));
  return [...mine, ...others].sort((a, b) => a.id.localeCompare(b.id));
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
