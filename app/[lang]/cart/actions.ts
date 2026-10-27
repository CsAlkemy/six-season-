"use server";

import { loadProducts, loadSettings, saveOrder } from "@/lib/data";
import { PAYMENT_LABEL } from "@/lib/i18n";
import { deliveryFee, methodAvailable, normalizePhone } from "@/lib/pricing";
import type { Lang, Order, PaymentMethodId } from "@/lib/types";

export interface OrderInput {
  lang: Lang;
  lines: { id: string; qty: number }[];
  name: string;
  phone: string;
  address: string;
  note: string;
  zoneId: string;
  method: PaymentMethodId;
  trxId: string;
  /** Honeypot: people never see it, bots fill it. */
  website: string;
}

export type OrderResult = { ok: true; no: string } | { ok: false; error: "phone" | "required" | "generic"; detail?: string };

const clip = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

export async function placeOrder(input: OrderInput): Promise<OrderResult> {
  const lang: Lang = input.lang === "en" ? "en" : "bn";
  const name = clip(input.name, 80);
  const address = clip(input.address, 400);
  const note = clip(input.note, 300);
  const trxId = clip(input.trxId, 40);
  const phone = normalizePhone(clip(input.phone, 20));

  // Pretend success so bots don't learn anything.
  if (input.website) return { ok: true, no: "MT-000000-0000" };
  if (!name || !address) return { ok: false, error: "required" };
  if (!phone) return { ok: false, error: "phone" };

  const [products, settings] = await Promise.all([loadProducts(), loadSettings()]);

  const items = (Array.isArray(input.lines) ? input.lines : []).flatMap((line) => {
    const product = products.find((p) => p.id === line.id && p.active && p.inStock);
    const qty = Math.floor(Number(line.qty));
    if (!product || !(qty >= 1 && qty <= 20)) return [];
    return [{ productId: product.id, name: product.name[lang], unit: product.unit[lang], price: product.price, qty }];
  });
  if (items.length === 0) return { ok: false, error: "generic", detail: "cart" };

  const zone = settings.delivery.zones.find((z) => z.id === input.zoneId && z.active);
  if (!zone) return { ok: false, error: "required" };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const fee = deliveryFee(zone, subtotal);
  const total = subtotal + fee;

  const method = settings.payments.methods.find((m) => m.id === input.method);
  if (!method || !methodAvailable(method, total)) {
    return { ok: false, error: "generic", detail: `${PAYMENT_LABEL[input.method]?.[lang] ?? input.method}` };
  }
  if (method.id !== "cod" && !trxId) return { ok: false, error: "required" };

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
  return { ok: true, no };
}
