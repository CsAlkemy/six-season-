"use server";

import { currentPhone, linkOrder, loadCustomer, newCustomer, saveCustomer } from "@/lib/customers";
import { loadProducts, loadSettings, saveOrder } from "@/lib/data";
import { PAYMENT_LABEL } from "@/lib/i18n";
import { orderFormSchema, type OrderFormInput } from "@/lib/order-schema";
import { deliveryFee, methodAvailable } from "@/lib/pricing";
import type { Lang, Order } from "@/lib/types";
import { findVariant } from "@/lib/variants";

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
  const { name, phone, address, note, trxId } = parsed.data;

  // The number must be the signed-in one: proven by an OTP at checkout or by the account's login.
  if ((await currentPhone()) !== phone) return { ok: false, error: "verify" };

  const [products, settings] = await Promise.all([loadProducts(), loadSettings()]);

  const items = (Array.isArray(input.lines) ? input.lines : []).flatMap((line) => {
    const product = products.find((p) => p.id === line.id && p.active);
    const variant = product && findVariant(product, typeof line.variant === "string" ? line.variant : undefined);
    const qty = Math.floor(Number(line.qty));
    if (!product || !variant?.inStock || !(qty >= 1 && qty <= 20)) return [];
    return [{ productId: product.id, variantId: variant.id, name: product.name[lang], unit: variant.label[lang], price: variant.price, qty }];
  });
  if (items.length === 0) return { ok: false, error: "generic", detail: "cart" };

  const zone = settings.delivery.zones.find((z) => z.id === parsed.data.zoneId && z.active);
  if (!zone) return { ok: false, error: "required" };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const fee = deliveryFee(zone, subtotal);
  const total = subtotal + fee;

  const method = settings.payments.methods.find((m) => m.id === parsed.data.method);
  if (!method || !methodAvailable(method, total)) {
    return { ok: false, error: "generic", detail: PAYMENT_LABEL[parsed.data.method][lang] };
  }

  const now = new Date();
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const no = `MT-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  // Inverted time sorts newest first in Blob listings; the random tail keeps the public URL unguessable.
  const id = `${String(1e13 - now.getTime()).padStart(13, "0")}-${no}-${crypto.randomUUID().slice(0, 12)}`;

  const order: Order = {
    id,
    no,
    createdAt: now.toISOString(),
    status: "new",
    lang,
    customer: { name, phone, address, note },
    zone: { id: zone.id, name: zone.name[lang] },
    items,
    subtotal,
    deliveryFee: fee,
    total,
    payment: { method: method.id, trxId: method.id === "cod" ? "" : trxId },
  };

  try {
    await saveOrder(order);
  } catch (error) {
    console.error("placeOrder", error);
    return { ok: false, error: "generic" };
  }
  // The order is in; failing to file it under the account or remember the address shouldn't fail it.
  try {
    const customer = (await loadCustomer(phone)) ?? newCustomer(phone);
    await Promise.all([linkOrder(order), saveCustomer({ ...customer, name: customer.name || name, address })]);
  } catch (error) {
    console.error("placeOrder: link", error);
  }
  return { ok: true, no, id };
}
