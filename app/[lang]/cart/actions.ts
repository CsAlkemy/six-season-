"use server";

import { headers } from "next/headers";

import { currentPhone, rememberOrder } from "@/lib/customers";
import { orderFormSchema, type OrderFormInput } from "@/lib/order-schema";
import { createOrder } from "@/lib/place-order";
import { smsEnabled } from "@/lib/sms";
import { withinLimit } from "@/lib/throttle";
import type { Lang } from "@/lib/types";

export interface OrderInput extends OrderFormInput {
  lang: Lang;
  lines: { id: string; variant?: string; qty: number }[];
}

export type OrderResult =
  | { ok: true; no: string; id: string }
  | { ok: false; error: "phone" | "required" | "verify" | "busy" | "generic"; detail?: string };

/**
 * Without a code nothing stops a script placing orders (and taking stock) with made-up numbers, so a guest's orders are
 * capped per connection and per number. Generous for people: mobile carriers share one address among many phones.
 */
const GUEST_ORDERS_PER_IP_HOUR = 10;
const GUEST_ORDERS_PER_PHONE_DAY = 5;

export async function placeOrder(input: OrderInput): Promise<OrderResult> {
  const lang: Lang = input?.lang === "en" ? "en" : "bn";

  // Pretend success so bots don't learn anything.
  if (input?.website) return { ok: true, no: "MT-000000-0000", id: "" };

  const parsed = orderFormSchema.safeParse(input);
  if (!parsed.success) {
    const phoneIssue = parsed.error.issues.some((issue) => issue.path[0] === "phone" && issue.message === "errPhone");
    return { ok: false, error: phoneIssue ? "phone" : "required" };
  }
  const { name, phone, address, note, trxId, zoneId, method } = parsed.data;

  // With SMS codes on, the number must be the signed-in one: proven by a code at checkout or by the account's login.
  // Without them a guest orders straight away; a signed-in shopper still orders for their own number only.
  const signedIn = await currentPhone();
  if (signedIn ? signedIn !== phone : smsEnabled()) return { ok: false, error: "verify" };
  const verified = signedIn === phone;
  if (!verified) {
    // Vercel sets x-forwarded-for to the visitor's own address.
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const [byIp, byPhone] = await Promise.all([
      withinLimit("checkout-ip", ip, GUEST_ORDERS_PER_IP_HOUR, 3_600_000).catch(() => true),
      withinLimit("checkout-phone", phone, GUEST_ORDERS_PER_PHONE_DAY, 86_400_000).catch(() => true),
    ]);
    if (!byIp || !byPhone) return { ok: false, error: "busy" };
  }

  const result = await createOrder({ lang, name, phone, verified, address, note, zoneId, methodId: method, trxId, lines: input.lines });
  if (!result.ok) return result;
  // A guest's order opens from this browser later; failing to set that shouldn't fail an order that's in.
  if (!verified) await rememberOrder(result.order.id).catch((error) => console.error("placeOrder: remember", error));
  return { ok: true, no: result.order.no, id: result.order.id };
}
