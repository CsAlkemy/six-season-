import { linkOrder, loadCustomer, newCustomer, saveCustomer } from "./customers";
import { loadProducts, loadSettings, refreshStorefront, saveOrder, saveProducts } from "./data";
import { isCash, kindOf } from "./payments";
import { deliveryFee, methodAvailable } from "./pricing";
import { moveStock } from "./stock";
import type { Lang, Order } from "./types";
import { findVariant } from "./variants";

export interface NewOrder {
  lang: Lang;
  name: string;
  /** Already normalised and, for the store, proven by a code. */
  phone: string;
  address: string;
  note: string;
  zoneId: string;
  methodId: string;
  trxId: string;
  lines: { id: string; variant?: string; qty: number }[];
  /** Orders the team keys in for a phone or walk-in customer: hidden products can be sold, a transaction ID can wait, and it may start confirmed. */
  admin?: { startConfirmed: boolean; adminNote: string };
}

export type PlaceResult = { ok: true; order: Order } | { ok: false; error: "required" | "generic"; detail?: "cart" | "payment" };

/** "MT-261029-4821" for people, and a Blob key that sorts newest first and can't be guessed. */
export function newOrderIds(now = new Date()) {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const no = `MT-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  return { no, id: `${String(1e13 - now.getTime()).padStart(13, "0")}-${no}-${crypto.randomUUID().slice(0, 12)}` };
}

/**
 * The one place an order is priced and filed, for the store's checkout and the admin's Create order: it prices
 * every line itself from the catalogue, takes the stock, saves the order and files it under the customer.
 */
export async function createOrder(input: NewOrder): Promise<PlaceResult> {
  const { lang, admin } = input;
  const [products, settings] = await Promise.all([loadProducts(), loadSettings()]);
  const maxQty = admin ? 99 : 20;

  const items = (Array.isArray(input.lines) ? input.lines : []).flatMap((line) => {
    const product = products.find((p) => p.id === line.id && (admin || p.active));
    const variant = product && findVariant(product, typeof line.variant === "string" ? line.variant : undefined);
    const qty = Math.floor(Number(line.qty));
    if (!product || !variant?.inStock || !(qty >= 1 && qty <= maxQty) || (variant.stock !== undefined && qty > variant.stock)) return [];
    return [{ productId: product.id, variantId: variant.id, name: product.name[lang], unit: variant.label[lang], price: variant.price, qty }];
  });
  if (items.length === 0 || items.length < (input.lines?.length ?? 0)) return { ok: false, error: "generic", detail: "cart" };

  const zone = settings.delivery.zones.find((z) => z.id === input.zoneId && z.active);
  if (!zone) return { ok: false, error: "required" };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const fee = deliveryFee(zone, subtotal);
  const total = subtotal + fee;

  const method = settings.payments.methods.find((m) => m.id === input.methodId);
  if (!method || !methodAvailable(method, total)) return { ok: false, error: "generic", detail: "payment" };
  const trxId = isCash(method) ? "" : input.trxId;
  if (!isCash(method) && !trxId && !admin) return { ok: false, error: "required" };

  const now = new Date();
  const { no, id } = newOrderIds(now);

  // Take the units before filing the order; a failed save puts them back. (Blob has no transactions: two
  // checkouts in the same second can still both read the old count.)
  const taken = moveStock(products, items, -1);
  if (taken.short.length) return { ok: false, error: "generic", detail: "cart" };
  const counted = taken.products.some((p, i) => p !== products[i]);
  try {
    if (counted) await saveProducts(taken.products);
  } catch (error) {
    console.error("createOrder: stock", error);
    return { ok: false, error: "generic" };
  }

  const at = now.toISOString();
  const confirmed = admin?.startConfirmed;
  const order: Order = {
    id,
    no,
    createdAt: at,
    status: confirmed ? "confirmed" : "new",
    lang,
    customer: { name: input.name, phone: input.phone, address: input.address, note: input.note },
    zone: { id: zone.id, name: zone.name[lang] },
    items,
    subtotal,
    deliveryFee: fee,
    total,
    payment: { method: method.id, trxId, name: method.name, kind: kindOf(method) },
    history: [{ status: "new", at }, ...(confirmed ? [{ status: "confirmed" as const, at }] : [])],
    stockTaken: counted,
    ...(admin ? { source: "admin" as const, ...(admin.adminNote ? { adminNote: admin.adminNote } : {}) } : {}),
  };

  try {
    await saveOrder(order);
  } catch (error) {
    console.error("createOrder", error);
    if (counted) await saveProducts(moveStock(taken.products, items, 1).products).catch(() => {});
    return { ok: false, error: "generic" };
  }
  // Counts changed: the cached store pages show "Only 3 left" and cap quantities by them, so they refresh now.
  if (counted) refreshStorefront();
  // The order is in; failing to file it under the account or remember the address shouldn't fail it.
  try {
    const customer = (await loadCustomer(input.phone)) ?? newCustomer(input.phone);
    await Promise.all([linkOrder(order), saveCustomer({ ...customer, name: customer.name || input.name, address: input.address })]);
  } catch (error) {
    console.error("createOrder: link", error);
  }
  return { ok: true, order };
}
