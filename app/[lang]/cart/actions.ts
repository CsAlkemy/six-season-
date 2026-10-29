"use server";

import { currentPhone } from "@/lib/customers";
import { orderFormSchema, type OrderFormInput } from "@/lib/order-schema";
import { createOrder } from "@/lib/place-order";
import type { Lang } from "@/lib/types";

export interface OrderInput extends OrderFormInput {
  lang: Lang;
  lines: { id: string; variant?: string; qty: number }[];
}

export type OrderResult =
  | { ok: true; no: string; id: string }
  | { ok: false; error: "phone" | "required" | "verify" | "generic"; detail?: string };

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

  // The number must be the signed-in one: proven by an OTP at checkout or by the account's login.
  if ((await currentPhone()) !== phone) return { ok: false, error: "verify" };

  const result = await createOrder({ lang, name, phone, address, note, zoneId, methodId: method, trxId, lines: input.lines });
  return result.ok ? { ok: true, no: result.order.no, id: result.order.id } : result;
}
