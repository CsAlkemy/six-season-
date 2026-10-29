import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

import { readAllJson, readJson, writeJson } from "./blob";
import { loadOrder } from "./data";
import { createCustomerSession, CUSTOMER_COOKIE, CUSTOMER_DAYS, sign, verifyCustomerSession } from "./session";
import { sendSms } from "./sms";
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
