"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { deleteImages, putFile } from "@/lib/blob";
import { htmlText, type Post, type PostText, today } from "@/lib/blog";
import { CATEGORIES } from "@/lib/categories";
import { book as bookWithCourier, cancel as cancelWithCourier, canCancelByApi, carrybee, type CourierAccounts, couriersView, DEFAULT_WEIGHT_KG, detectPlace, listPlaces, loadAccounts, needsPlace, newSecret, placeRequired, openAccounts, pathao, saveAccounts, steadfast } from "@/lib/couriers";
import { COURIER_NAME, type CouriersView, FINAL_STAGES, isActive, type PickupStore, type Place, stageOf, trackingUrl } from "@/lib/couriers/meta";
import { resetWhatsApp } from "@/lib/account-mail";
import { createReset, listCustomerOrders, loadCustomer } from "@/lib/customers";
import { loadAllOrders, loadOrder, loadPosts, loadProducts, loadSettings, refreshStorefront, saveOrder, savePosts, saveProducts, saveSettings } from "@/lib/data";
import { cleanPostHtml, htmlImages } from "@/lib/post-html";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { DEFAULT_FROM, EMAIL_ADDRESS, EMAIL_EVENTS, type EmailConfig, type EmailEvent, type EmailView, emailView, MAX_RECIPIENTS, saveEmailConfig, sendEmail, validFrom } from "@/lib/email";
import { testEmail } from "@/lib/notify";
import { readVault } from "@/lib/vault";
import { MAX_TARGET_MARGIN, type ProductCosts } from "@/lib/costing";
import { saveProductCosts } from "@/lib/product-costs";
import { canCancel, NEXT_STEP, withStatus } from "@/lib/orders";
import { createOrder } from "@/lib/place-order";
import { paymentIsCash } from "@/lib/payments";
import { indexShipment, recordNews, syncShipment } from "@/lib/shipping";
import { normalizePhone } from "@/lib/pricing";
import { sendSms, smsEnabled } from "@/lib/sms";
import { createSession, passwordMatches, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { absolute, waNumber } from "@/lib/site";
import { moveStock, summarize, withStock } from "@/lib/stock";
import { taka } from "@/lib/i18n";
import { MAX_TESTIMONIAL_TEXT, MAX_TESTIMONIALS } from "@/lib/testimonials";
import { COURIERS, type CourierId, LANGS, MAX_PHOTOS, SEASONS, SOCIALS, type FaqItem, type HomeReview, type Shipment, type HomeSection, type Lang, type Order, type PaymentKind, type PaymentMethod, type Product, type Settings, type Text, type Testimonial, type Tone, type Variant } from "@/lib/types";

export type Saved = { ok: true; id?: string } | { ok: false; error: string };

const str = (form: FormData, key: string, max = 2000) => String(form.get(key) ?? "").trim().slice(0, max);
const money = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));
const text = (raw: unknown, max = 600): Text => {
  const value = (raw ?? {}) as Partial<Text>;
  return { bn: String(value.bn ?? "").trim().slice(0, max), en: String(value.en ?? "").trim().slice(0, max) };
};
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
/** A social page as an https link ("facebook.com/matirtaan" gains the scheme), or "" when it isn't a web address. */
function pageUrl(raw: unknown): string {
  const value = String(raw ?? "").trim().slice(0, 200);
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    url.protocol = "https:";
    return url.hostname.includes(".") ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Our own uploads (Blob, or the local folder in development) or the bundled stand-in photos; nothing else goes into a product, the hero or a post. */
const isImage = (url: unknown): url is string => typeof url === "string" && /^(https:\/\/[^\s"]+|\/(images|local-uploads)\/[\w./-]+)$/.test(url);
const dropUploads = deleteImages;
const failed = (error: unknown): Saved => ({ ok: false, error: error instanceof Error ? error.message : "Couldn't save." });

/** Every upload the home page's settings use, so a save, or a cancelled dialog, deletes only what nothing uses. */
const homeUploads = (home: Settings["home"]) =>
  [home.hero.image, home.review.avatar, home.review.photo, ...home.testimonials.flatMap((t) => [t.avatar, t.video, t.poster])].filter((src): src is string => Boolean(src));
/** An upload in the home folder: Vercel Blob's, or the local folder's in development. */
const inHomeFolder = (url: string) => /^(https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/home\/|\/local-uploads\/home-)/.test(url);

export async function login(_: string | null, form: FormData): Promise<string | null> {
  if (!(await passwordMatches(str(form, "password", 200)))) return "Wrong password.";
  (await cookies()).set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* Orders */

async function nextStep(order: Order): Promise<Order | null> {
  const step = NEXT_STEP[order.status];
  if (!step) return null;
  const updated = withStatus(order, step.to);
  await saveOrder(updated);
  return updated;
}

/** One order one step on: new → confirmed → packing → shipped → delivered. `from` guards against a double click. */
export async function advanceOrder(id: string, from: string): Promise<Saved> {
  await requireAdmin();
  const order = await loadOrder(id);
  if (!order || order.status !== from) return { ok: false, error: "This order changed meanwhile. Reload to see it." };
  try {
    await nextStep(order);
  } catch (error) {
    return failed(error);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Each ticked order one step on from wherever it is; finished and cancelled ones are skipped. */
export async function advanceOrders(ids: string[]): Promise<Saved> {
  await requireAdmin();
  try {
    for (const id of ids.slice(0, 200)) {
      const order = await loadOrder(String(id));
      if (order) await nextStep(order);
    }
  } catch (error) {
    return failed(error);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Cancels before it ships, and puts its units back on the shelf. */
export async function cancelOrder(id: string, reason: string): Promise<Saved> {
  await requireAdmin();
  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (!canCancel(order)) return { ok: false, error: "It has already shipped, so it can't be cancelled. If the courier is returning it, refresh the parcel's status first." };
  try {
    if (order.stockTaken) {
      const back = moveStock(await loadProducts(), order.items, 1);
      await saveProducts(back.products);
      refreshStorefront();
    }
    await saveOrder({ ...withStatus(order, "cancelled", String(reason ?? "").trim().slice(0, 300) || undefined), stockTaken: false });
  } catch (error) {
    return failed(error);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function saveOrderNote(id: string, note: string): Promise<Saved> {
  await requireAdmin();
  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  try {
    await saveOrder({ ...order, adminNote: String(note ?? "").trim().slice(0, 1000) });
  } catch (error) {
    return failed(error);
  }
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true };
}

/** What the team keys in for a phone or walk-in customer. Prices and totals are never taken from here. */
export interface AdminOrderInput {
  lang: "bn" | "en";
  name: string;
  phone: string;
  address: string;
  note: string;
  zoneId: string;
  methodId: string;
  trxId: string;
  lines: { id: string; variant?: string; qty: number }[];
  adminNote: string;
  startConfirmed: boolean;
  /** Ignored while SMS is off. */
  sendSms: boolean;
}

/** A returning customer's saved details, so a repeat phone order starts filled in. */
export async function lookupCustomer(phone: string): Promise<{ name: string; address: string; orders: number } | null> {
  await requireAdmin();
  const normal = normalizePhone(String(phone ?? ""));
  if (!normal) return null;
  const customer = await loadCustomer(normal);
  if (!customer) return null;
  return { name: customer.name, address: customer.address, orders: (await listCustomerOrders(normal).catch(() => [])).length };
}

export async function createAdminOrder(input: AdminOrderInput): Promise<{ ok: true; id: string; no: string; smsSent: boolean | null } | { ok: false; error: string }> {
  await requireAdmin();
  const lang = input?.lang === "en" ? "en" : "bn";
  const name = String(input?.name ?? "").trim().slice(0, 80);
  const phone = normalizePhone(String(input?.phone ?? ""));
  const address = String(input?.address ?? "").trim().slice(0, 400);
  if (!name) return { ok: false, error: "Add the customer's name." };
  if (!phone) return { ok: false, error: "Enter a Bangladeshi mobile number, like 01712345678." };
  if (address.length < 5) return { ok: false, error: "Add the delivery address." };
  if (!Array.isArray(input.lines) || input.lines.length === 0) return { ok: false, error: "Add at least one product." };
  if (input.lines.length > 30) return { ok: false, error: "That's too many lines for one order." };

  const result = await createOrder({
    lang,
    name,
    phone,
    // The team spoke to the customer, so the number counts as theirs.
    verified: true,
    address,
    note: String(input.note ?? "").trim().slice(0, 300),
    zoneId: String(input.zoneId ?? ""),
    methodId: String(input.methodId ?? ""),
    trxId: String(input.trxId ?? "").trim().toUpperCase().slice(0, 40),
    lines: input.lines.map((l) => ({ id: String(l.id), variant: l.variant ? String(l.variant) : undefined, qty: Number(l.qty) })),
    admin: { startConfirmed: Boolean(input.startConfirmed), adminNote: String(input.adminNote ?? "").trim().slice(0, 1000) },
  });
  if (!result.ok) {
    if (result.detail === "cart") return { ok: false, error: "A product is sold out or doesn't have that many left. Check the quantities." };
    if (result.detail === "payment") return { ok: false, error: "That payment method isn't available for this order. Check it's switched on and the total is within its limit." };
    return { ok: false, error: "Pick a delivery zone and a payment method." };
  }

  const { order } = result;
  let smsSent: boolean | null = null;
  if (input.sendSms && smsEnabled()) {
    const body = lang === "bn" ? `মাটির টান: আপনার অর্ডার ${order.no} পেয়েছি। মোট ${taka(order.total, "bn")}। ধন্যবাদ!` : `Matir Taan: we've got your order ${order.no}. Total ${taka(order.total, "en")}. Thank you!`;
    smsSent = await sendSms(phone, body).catch(() => false);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, id: order.id, no: order.no, smsSent };
}

/* Products */

/** A photo for a product or the hero. The browser already shrank it to a WebP. */
export async function uploadImage(form: FormData): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const file = form.get("file");
  const folder = (["home", "blog"] as const).find((f) => f === str(form, "folder")) ?? "products";
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return { error: "Upload an image under 4 MB." };
  try {
    return { url: await putFile(folder, file) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't upload." };
  }
}

/** A product's "more about it" text: the editor's HTML, cleaned like a post's but with no photos (those go in the gallery). */
const productHtml = (raw: unknown) => cleanPostHtml(String(raw ?? "").slice(0, 20_000), { photos: false });

/** What the product form posts; every field is checked again here. */
export interface ProductDraft {
  id: string;
  slug: string;
  name: Text;
  description: Text;
  images: string[];
  tone: Tone;
  seasons: string[];
  /** A lib/categories.ts id, or "" for none. */
  category: string;
  /** HTML from the editor, one per language. */
  details: Text;
  /** The home page tile's one line; optional, so an older form leaves it as it was. */
  tagline?: Text;
  seo: { title: Text; description: Text };
  active: boolean;
  lowStockAt: number;
  /** `buy` and `pack` are one unit's costs (Costs & pricing); they go to the vault, never into the product. */
  variants: { id: string; label: Text; price: number; compareAt: number | null; stock: number; buy: number; pack: number }[];
  /** The rest of Costs & pricing, also kept in the vault. */
  costs: { marketing: number; monthlyUnits: number; targetMargin: number };
}

/** A cost in taka: paisa allowed (packing can be ৳2.50), nothing negative. */
const amount = (value: unknown) => Math.min(Math.max(0, Math.round((Number(value) || 0) * 100) / 100), 100_000_000);

export async function saveProduct(draft: ProductDraft): Promise<Saved> {
  await requireAdmin();
  const products = await loadProducts();
  const existing = products.find((p) => p.id === draft?.id);

  const name = text(draft?.name, 120);
  if (!name.bn || !name.en) return { ok: false, error: "Add the name in both languages." };
  const slug = slugify(String(draft.slug ?? "") || name.en);
  if (!slug) return { ok: false, error: "Add a URL slug in English letters." };
  if (products.some((p) => p.slug === slug && p.id !== existing?.id)) return { ok: false, error: `Another product already uses "${slug}".` };

  const raw = Array.isArray(draft.variants) ? draft.variants.slice(0, 12) : [];
  if (!raw.length) return { ok: false, error: "Add at least one size." };
  const ids = new Set<string>();
  const variants: Variant[] = raw.map((v) => {
    // Keep a size's id so carts holding it still find it; new sizes get one.
    let id = String(v.id ?? "").replace(/[^\w-]/g, "").slice(0, 40) || `v-${crypto.randomUUID().slice(0, 6)}`;
    if (ids.has(id)) id = `v-${crypto.randomUUID().slice(0, 6)}`;
    ids.add(id);
    const compareAt = money(v.compareAt);
    return withStock({ id, label: text(v.label, 40), price: money(v.price), compareAt: compareAt > 0 ? compareAt : null, inStock: true }, Math.min(money(v.stock), 99_999));
  });
  if (variants.some((v) => !v.label.bn || !v.label.en)) return { ok: false, error: "Name every size in both languages, e.g. ৫০০ গ্রাম / 500 g." };
  if (variants.some((v) => v.price <= 0)) return { ok: false, error: "Give every size a price." };

  const images = (Array.isArray(draft.images) ? draft.images : []).filter(isImage).slice(0, MAX_PHOTOS);
  const details: Text = { bn: productHtml(draft.details?.bn), en: productHtml(draft.details?.en) };
  const id = existing?.id ?? `${slug}-${crypto.randomUUID().slice(0, 4)}`;
  const product = summarize({
    id,
    slug,
    name,
    description: text(draft.description, 3000),
    unit: variants[0]!.label,
    price: variants[0]!.price,
    compareAt: null,
    variants,
    image: images[0] ?? null,
    images,
    tone: (["butter", "mustard", "soil", "leaf"].includes(draft.tone) ? draft.tone : "soil") as Tone,
    seasons: SEASONS.filter((s) => draft.seasons?.includes(s)),
    // "" rather than missing when none is chosen, so a starter product can be taken out of its category too.
    category: CATEGORIES.some((c) => c.id === draft.category) ? draft.category : "",
    details,
    tagline: draft.tagline ? text(draft.tagline, 60) : (existing?.tagline ?? { bn: "", en: "" }),
    seo: { title: text(draft.seo?.title, 70), description: text(draft.seo?.description, 200) },
    inStock: true,
    active: Boolean(draft.active),
    lowStockAt: Math.min(money(draft.lowStockAt), 9999),
  });

  // Costs are kept by the sizes' saved ids, so a new size's costs follow the id it was just given. A form without them
  // leaves what's stored alone.
  const costs: ProductCosts | null =
    draft.costs && typeof draft.costs === "object"
      ? {
          sizes: Object.fromEntries(variants.map((v, i) => [v.id, { buy: amount(raw[i]?.buy), pack: amount(raw[i]?.pack) }])),
          marketing: amount(draft.costs.marketing),
          monthlyUnits: Math.min(money(draft.costs.monthlyUnits), 10_000_000),
          targetMargin: Math.min(Math.max(Math.round((Number(draft.costs.targetMargin) || 0) * 10) / 10, 0), MAX_TARGET_MARGIN),
        }
      : null;

  try {
    // Costs first: if they can't be kept, nothing is saved and the form says so, rather than a product without them.
    if (costs) await saveProductCosts(id, costs);
    await saveProducts(existing ? products.map((p) => (p.id === id ? product : p)) : [...products, product]);
  } catch (error) {
    return failed(error);
  }
  if (existing) await dropUploads([...(existing.images ?? []), existing.image ?? ""].filter((u) => u && !images.includes(u)));
  refreshStorefront();
  revalidatePath("/admin", "layout");
  return { ok: true, id };
}

export async function deleteProduct(id: string): Promise<Saved> {
  await requireAdmin();
  const products = await loadProducts();
  const product = products.find((p) => p.id === id);
  if (!product) return { ok: false, error: "Product not found." };
  try {
    await saveProducts(products.filter((p) => p.id !== product.id));
    // Home sections that listed it drop it too, so the settings page doesn't count a ghost, and the featured review
    // stops naming it.
    const settings = await loadSettings();
    const inSections = settings.home.sections.some((sec) => sec.productIds.includes(product.id));
    const inReview = settings.home.review.productId === product.id;
    if (inSections || inReview) {
      await saveSettings({
        ...settings,
        home: {
          ...settings.home,
          sections: settings.home.sections.map((sec) => ({ ...sec, productIds: sec.productIds.filter((id) => id !== product.id) })),
          review: inReview ? { ...settings.home.review, productId: "" } : settings.home.review,
        },
      });
    }
  } catch (error) {
    return failed(error);
  }
  await dropUploads([...new Set([...(product.images ?? []), product.image ?? ""])].filter(Boolean));
  // Its costs go with it. The product is already gone, so a failure here only leaves an unused entry behind.
  await saveProductCosts(product.id, null).catch(() => {});
  refreshStorefront();
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Shows or hides products on the store, one from its switch or several from the bulk bar. */
export async function setProductsActive(ids: string[], active: boolean): Promise<Saved> {
  await requireAdmin();
  const products = await loadProducts();
  try {
    await saveProducts(products.map((p) => (ids.includes(p.id) ? { ...p, active: Boolean(active) } : p)));
  } catch (error) {
    return failed(error);
  }
  refreshStorefront();
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Moves a product one place up or down; the storefront lists them in this order. */
export async function moveProduct(id: string, dir: "up" | "down"): Promise<Saved> {
  await requireAdmin();
  const products = await loadProducts();
  const from = products.findIndex((p) => p.id === id);
  const to = from + (dir === "up" ? -1 : 1);
  if (from < 0 || to < 0 || to >= products.length) return { ok: false, error: "It can't move any further." };
  [products[from], products[to]] = [products[to]!, products[from]!];
  try {
    await saveProducts(products);
  } catch (error) {
    return failed(error);
  }
  refreshStorefront();
  revalidatePath("/admin/products");
  return { ok: true };
}

/* Settings */

/** The settings page posts the whole object; every field is re-checked here. */
export async function saveStoreSettings(raw: Settings): Promise<Saved> {
  await requireAdmin();
  if (!raw || typeof raw !== "object") return { ok: false, error: "Couldn't read the form." };

  const zones = (raw.delivery?.zones ?? []).slice(0, 20).map((z, i) => ({
    id: slugify(String(z.id || z.name?.en || "")) || `zone-${i + 1}`,
    name: text(z.name, 60),
    fee: money(z.fee),
    freeAbove: money(z.freeAbove),
    time: text(z.time, 30),
    active: Boolean(z.active),
  }));
  zones.forEach((z, i) => {
    if (zones.findIndex((other) => other.id === z.id) < i) z.id = `${z.id}-${i + 1}`;
  });
  if (zones.some((z) => !z.name.bn || !z.name.en)) return { ok: false, error: "Every delivery area needs a name in both languages." };
  if (!zones.some((z) => z.active)) return { ok: false, error: "Keep at least one delivery area on." };

  // Payment methods are a list the admin builds: cash on delivery is always there, the rest are wallets or banks.
  const builtin = (id: string) => DEFAULT_SETTINGS.payments.methods.find((d) => d.id === id);
  const usedIds = new Set<string>();
  const methods: PaymentMethod[] = (Array.isArray(raw.payments?.methods) ? raw.payments.methods : []).slice(0, 12).map((m, i) => {
    const cash = m?.id === "cod";
    const kind: PaymentKind = cash ? "cash" : m?.kind === "bank" ? "bank" : "wallet";
    const name = text(m?.name, 40);
    let id = cash ? "cod" : slugify(String(m?.id || name.en || "")) || `method-${i + 1}`;
    if (!cash && (id === "cod" || usedIds.has(id))) id = `${id}-${i + 1}`;
    usedIds.add(id);
    const fallback = builtin(id);
    return {
      id,
      kind,
      name: { bn: name.bn || fallback?.name.bn || "", en: name.en || fallback?.name.en || "" },
      enabled: Boolean(m?.enabled),
      account: kind === "cash" ? "" : kind === "bank" ? String(m?.account ?? "").trim().slice(0, 120) : String(m?.account ?? "").replace(/[^\d+]/g, "").slice(0, 20),
      accountType: kind === "cash" ? "" : String(m?.accountType ?? "").trim().slice(0, 30),
      maxAmount: money(m?.maxAmount),
      instructions: text(m?.instructions, 300),
    };
  });
  if (!methods.some((m) => m.id === "cod")) methods.unshift(structuredClone(builtin("cod")!));
  const unnamed = methods.find((m) => !m.name.bn || !m.name.en);
  if (unnamed) return { ok: false, error: "Every payment method needs a name in both languages." };
  if (!methods.some((m) => m.enabled)) return { ok: false, error: "Keep at least one payment method on." };
  const noAccount = methods.find((m) => m.enabled && m.kind !== "cash" && !m.account);
  if (noAccount) return { ok: false, error: `Add the ${noAccount.kind === "bank" ? "account details" : "number"} for ${noAccount.name.en} before switching it on.` };

  const productIds = new Set((await loadProducts()).map((p) => p.id));
  const hero = raw.home?.hero ?? DEFAULT_SETTINGS.home.hero;
  const sections: HomeSection[] = (raw.home?.sections ?? []).slice(0, 10).map((section, i) => ({
    id: slugify(String(section.id ?? "")) || `section-${i + 1}`,
    enabled: Boolean(section.enabled),
    title: text(section.title, 80),
    subtitle: text(section.subtitle, 200),
    productIds: [...new Set((section.productIds ?? []).map(String))].filter((id) => productIds.has(id)).slice(0, 24),
  }));
  // Ids are the home page's keys and anchors, so two sections never share one (a new one could take a deleted one's).
  sections.forEach((s, i) => {
    if (sections.findIndex((other) => other.id === s.id) < i) s.id = `${s.id}-${i + 1}`;
  });
  if (sections.some((s) => !s.title.bn || !s.title.en)) return { ok: false, error: "Give every home section a title in both languages." };
  const heroTitle = text(hero.title, 120);
  if (hero.enabled && (!heroTitle.bn || !heroTitle.en)) return { ok: false, error: "Give the hero a title in both languages, or switch it off." };
  // Checklist lines with words in either language; one written in only one shows only on that language's page.
  const points = (Array.isArray(hero.points) ? hero.points : []).slice(0, 4).map((p) => text(p, 70)).filter((p) => p.bn || p.en);

  // The featured review: a real customer's words, so it needs them, their name and a rating before it can show.
  const r = raw.home?.review ?? DEFAULT_SETTINGS.home.review;
  const review: HomeReview = {
    enabled: Boolean(r.enabled),
    title: text(r.title, 80),
    text: String(r.text ?? "").trim().slice(0, 600),
    name: String(r.name ?? "").trim().slice(0, 60),
    source: String(r.source ?? "").trim().slice(0, 30),
    rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
    avatar: isImage(r.avatar) ? r.avatar : null,
    photo: isImage(r.photo) ? r.photo : null,
    productId: productIds.has(String(r.productId ?? "")) ? String(r.productId) : "",
  };
  if (review.enabled && (!review.text || !review.name)) return { ok: false, error: "Add the customer's words and name to the featured review, or switch it off." };

  const faq: FaqItem[] = (Array.isArray(raw.home?.faq) ? raw.home.faq : []).slice(0, 12).map((item, i) => ({
    id: slugify(String(item?.id ?? "")) || `faq-${i + 1}`,
    question: text(item?.question, 160),
    answer: text(item?.answer, 800),
  }));
  faq.forEach((f, i) => {
    if (faq.findIndex((other) => other.id === f.id) < i) f.id = `${f.id}-${i + 1}`;
  });
  if (faq.some((f) => !f.question.bn || !f.question.en || !f.answer.bn || !f.answer.en)) return { ok: false, error: "Give every question and its answer in both languages." };

  // Customer feedback: their words or their video, and who they are. Written feedback keeps no video, and the reverse.
  const testimonials: Testimonial[] = (Array.isArray(raw.home?.testimonials) ? raw.home.testimonials : []).slice(0, MAX_TESTIMONIALS).map((item, i) => {
    const kind = item?.kind === "video" ? "video" : "text";
    return {
      id: slugify(String(item?.id ?? "")) || `feedback-${i + 1}`,
      enabled: Boolean(item?.enabled),
      kind,
      name: String(item?.name ?? "").trim().slice(0, 60),
      role: String(item?.role ?? "").trim().slice(0, 60),
      avatar: isImage(item?.avatar) ? item.avatar : null,
      text: kind === "text" ? String(item?.text ?? "").trim().slice(0, MAX_TESTIMONIAL_TEXT) : "",
      video: kind === "video" && isImage(item?.video) ? item.video : null,
      poster: kind === "video" && isImage(item?.poster) ? item.poster : null,
    };
  });
  testimonials.forEach((t, i) => {
    if (testimonials.findIndex((other) => other.id === t.id) < i) t.id = `${t.id}-${i + 1}`;
  });
  if (testimonials.some((t) => !t.name || !t.role)) return { ok: false, error: "Give every customer feedback a name and a profession." };
  if (testimonials.some((t) => t.kind === "text" && !t.text)) return { ok: false, error: "Add the customer's words to every written feedback, or delete it." };
  if (testimonials.some((t) => t.kind === "video" && !t.video)) return { ok: false, error: "Upload the video for every video feedback, or delete it." };

  const store = raw.store ?? DEFAULT_SETTINGS.store;
  const previous = await loadSettings();
  const settings: Settings = {
    store: {
      phone: String(store.phone ?? "").trim().slice(0, 30),
      whatsapp: waNumber(String(store.whatsapp ?? "")).slice(0, 15),
      email: String(store.email ?? "").trim().slice(0, 120),
      address: text(store.address, 240),
      announcement: text(store.announcement, 120),
      social: Object.fromEntries(SOCIALS.map((s) => [s, pageUrl(store.social?.[s])])) as Settings["store"]["social"],
      seo: { title: text(store.seo?.title, 70), description: text(store.seo?.description, 200) },
    },
    delivery: { zones },
    payments: { methods },
    returns: { days: Math.min(money(raw.returns?.days), 30) },
    home: {
      hero: {
        enabled: Boolean(hero.enabled),
        title: heroTitle,
        subtitle: text(hero.subtitle, 300),
        cta: text(hero.cta, 40),
        image: isImage(hero.image) ? hero.image : null,
        points,
        badge: text(hero.badge, 30),
      },
      sections,
      review,
      testimonials,
      faq,
    },
  };
  try {
    await saveSettings(settings);
  } catch (error) {
    return failed(error);
  }
  // Photos and videos taken off the home page are deleted from storage.
  const kept = new Set(homeUploads(settings.home));
  const dropped = homeUploads(previous.home).filter((src) => !kept.has(src));
  if (dropped.length) await dropUploads(dropped);
  refreshStorefront();
  return { ok: true };
}

/**
 * Uploads made in a customer feedback dialog that were cancelled or replaced before saving. Only the home folder's,
 * and never one the saved settings use.
 */
export async function discardUploads(urls: string[]): Promise<void> {
  await requireAdmin();
  const used = new Set(homeUploads((await loadSettings()).home));
  const drop = (Array.isArray(urls) ? urls : []).slice(0, 10).filter((url) => isImage(url) && inHomeFolder(url) && !used.has(url));
  if (drop.length) await dropUploads(drop);
}

/* Notifications */

export interface EmailSettingsInput {
  /** A new Resend key; empty keeps the saved one. */
  apiKey: string;
  removeKey: boolean;
  from: string;
  /** Addresses separated by commas, spaces or new lines. */
  to: string;
  events: Record<EmailEvent, boolean>;
}

export type EmailSaved = { ok: true; view: EmailView } | { ok: false; error: string };

/** Email alerts' setup. The key never comes back to the page: it's kept in the vault and shown masked. */
export async function saveEmailSettings(input: EmailSettingsInput): Promise<EmailSaved> {
  await requireAdmin();
  const current = await readVault<EmailConfig>("email").catch(() => null);
  const typed = String(input?.apiKey ?? "").trim();
  if (typed && !/^re_[\w-]{8,200}$/.test(typed)) return { ok: false, error: "That doesn't look like a Resend API key. They start with re_." };
  const apiKey = input?.removeKey ? "" : typed || current?.apiKey || "";

  const from = String(input?.from ?? "").trim().slice(0, 120) || DEFAULT_FROM;
  if (!validFrom(from)) return { ok: false, error: "Write the sender as an email address, or as Name <email@domain>." };
  const to = [...new Set(String(input?.to ?? "").split(/[\s,;]+/).map((a) => a.trim().toLowerCase()).filter(Boolean))];
  const bad = to.find((address) => !EMAIL_ADDRESS.test(address));
  if (bad) return { ok: false, error: `"${bad.slice(0, 60)}" isn't an email address.` };
  if (to.length > MAX_RECIPIENTS) return { ok: false, error: `Send to ${MAX_RECIPIENTS} addresses at most.` };
  if (apiKey && !to.length) return { ok: false, error: "Add the email address the alerts should go to." };
  const events = Object.fromEntries(EMAIL_EVENTS.map((e) => [e, Boolean(input?.events?.[e] ?? true)])) as Record<EmailEvent, boolean>;

  try {
    await saveEmailConfig({ apiKey, from, to, events });
    return { ok: true, view: await emailView() };
  } catch (error) {
    return failed(error) as { ok: false; error: string };
  }
}

/** Sends the test email with what's saved, and says what Resend answered. */
export async function sendTestEmail(): Promise<EmailSaved> {
  await requireAdmin();
  const config = await readVault<EmailConfig>("email").catch(() => null);
  if (!config?.apiKey) return { ok: false, error: "Save a Resend API key first." };
  if (!config.to.length) return { ok: false, error: "Add an address to send to first." };
  const sent = await sendEmail(config, testEmail());
  return sent.ok ? { ok: true, view: await emailView() } : sent;
}

export interface PostDraft {
  id: string;
  slug: string;
  active: boolean;
  image: string | null;
  products: string[];
  text: Record<Lang, PostText>;
}

/** A post's banner and the photos in its text, so a save or delete can clear out the uploads it no longer uses. */
const postImages = (post: Pick<Post, "image" | "text">) => [post.image ?? "", ...LANGS.flatMap((lang) => htmlImages(post.text[lang].html))].filter(Boolean);

/** Saves a post from the editor; a new one gets its id. It's dated the day it first goes out on the blog. */
export async function savePost(draft: PostDraft): Promise<Saved> {
  await requireAdmin();
  const [posts, products] = await Promise.all([loadPosts(), loadProducts()]);
  const existing = posts.find((p) => p.id === draft?.id);

  const postText = Object.fromEntries(
    LANGS.map((lang) => {
      const raw = draft?.text?.[lang];
      return [lang, { title: String(raw?.title ?? "").trim().slice(0, 160), description: String(raw?.description ?? "").trim().slice(0, 300), html: cleanPostHtml(String(raw?.html ?? "").slice(0, 300_000)) }];
    }),
  ) as Post["text"];
  const written = LANGS.filter((lang) => postText[lang].title || htmlText(postText[lang].html));
  if (!written.length) return { ok: false, error: "Write a title and some text first." };
  const half = written.find((lang) => !postText[lang].title || !htmlText(postText[lang].html));
  if (half) return { ok: false, error: `Add both a title and text in ${half === "bn" ? "Bangla" : "English"}, or leave that language empty.` };

  const slug = slugify(String(draft.slug ?? "") || postText.en.title) || existing?.slug || `post-${crypto.randomUUID().slice(0, 6)}`;
  if (posts.some((p) => p.slug === slug && p.id !== existing?.id)) return { ok: false, error: `Another post already uses "${slug}".` };

  const active = Boolean(draft.active);
  const day = today();
  const published = existing?.active ? existing.published : active ? day : (existing?.published ?? day);
  // Google is told a published post changed when its text does, from the day after it went out.
  const edited = existing?.active && active && day !== published && JSON.stringify(existing.text) !== JSON.stringify(postText);
  const updated = edited ? day : existing?.updated;
  const post: Post = {
    id: existing?.id ?? `${slug}-${crypto.randomUUID().slice(0, 4)}`,
    slug,
    published,
    ...(updated && { updated }),
    active,
    image: isImage(draft.image) ? draft.image : null,
    products: [...new Set((Array.isArray(draft.products) ? draft.products : []).map(String))].filter((id) => products.some((p) => p.id === id)).slice(0, 12),
    text: postText,
  };

  try {
    await savePosts(existing ? posts.map((p) => (p.id === post.id ? post : p)) : [post, ...posts]);
  } catch (error) {
    return failed(error);
  }
  if (existing) {
    const kept = new Set(postImages(post));
    await dropUploads(postImages(existing).filter((url) => !kept.has(url)));
  }
  refreshStorefront();
  revalidatePath("/admin", "layout");
  return { ok: true, id: post.id };
}

/** Takes a post off the blog for good, with its banner and photos. */
export async function deletePost(id: string): Promise<Saved> {
  await requireAdmin();
  const posts = await loadPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) return { ok: false, error: "That post is already gone." };
  try {
    await savePosts(posts.filter((p) => p.id !== id));
  } catch (error) {
    return failed(error);
  }
  await dropUploads(postImages(post));
  refreshStorefront();
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* Couriers */

const courierOf = (value: unknown): CourierId | undefined => COURIERS.find((c) => c === value);
const field = (value: unknown, max = 300) => String(value ?? "").trim().slice(0, max);

/** What the connect dialog sends. Secret fields left empty keep what's saved. */
export interface CourierKeysInput {
  courier: CourierId;
  sandbox: boolean;
  apiKey?: string;
  secretKey?: string;
  clientId?: string;
  clientSecret?: string;
  clientContext?: string;
  username?: string;
  password?: string;
  /** Pathao and CarryBee: the pickup store, chosen after the keys check out. */
  storeId?: string;
}

export type CourierConnected =
  | { ok: true; view: CouriersView; message: string }
  /** The keys work; now pick the pickup store. */
  | { ok: true; stores: PickupStore[] }
  | { ok: false; error: string };

/**
 * Checks a courier's keys against the courier itself before saving them, so a typo shows up now and not at the first
 * booking. Pathao and CarryBee then want the pickup store: the first answer lists them, the second saves.
 */
export async function connectCourier(input: CourierKeysInput): Promise<CourierConnected> {
  await requireAdmin();
  const id = courierOf(input?.courier);
  if (!id) return { ok: false, error: "Pick a courier." };
  const { accounts } = await openAccounts();
  let next: CourierAccounts;
  let message = `${COURIER_NAME[id].en} is connected.`;

  if (id === "steadfast") {
    const prev = accounts.steadfast;
    const account = { apiKey: field(input.apiKey) || prev?.apiKey || "", secretKey: field(input.secretKey) || prev?.secretKey || "", webhookToken: prev?.webhookToken || newSecret() };
    if (!account.apiKey || !account.secretKey) return { ok: false, error: "Add both the API key and the secret key." };
    const r = await steadfast.check(account);
    if (!r.ok) return r;
    message += ` Balance: ${taka(r.value.balance, "en")}.`;
    next = { ...accounts, steadfast: account };
  } else {
    const prev = id === "pathao" ? accounts.pathao : accounts.carrybee;
    // Moving between sandbox and live, or to another account, means new secrets: the old ones belong elsewhere.
    const sameAccount = prev && prev.sandbox === Boolean(input.sandbox) && prev.clientId === (field(input.clientId) || prev.clientId);
    const keep = (typed: unknown, saved: string | undefined) => field(typed) || (sameAccount ? saved ?? "" : "");
    const storeId = field(input.storeId, 40);
    let stores: PickupStore[];
    if (id === "pathao") {
      const p = accounts.pathao;
      const account: pathao.PathaoAccount = {
        sandbox: Boolean(input.sandbox),
        clientId: field(input.clientId) || p?.clientId || "",
        clientSecret: keep(input.clientSecret, p?.clientSecret),
        username: field(input.username, 120) || p?.username || "",
        password: keep(input.password, p?.password),
        storeId,
        storeName: "",
        webhookSecret: p?.webhookSecret || newSecret(),
      };
      if (!account.clientId || !account.clientSecret || !account.username || !account.password) return { ok: false, error: "Add the client ID and secret, and the Pathao merchant email and password." };
      const r = await pathao.check(account);
      if (!r.ok) return r;
      stores = r.value.stores;
      const store = stores.find((s) => String(s.id) === storeId);
      if (!store) return stores.length ? { ok: true, stores } : { ok: false, error: "The keys work, but this Pathao account has no store yet. Add one in the Pathao panel first." };
      next = { ...accounts, pathao: { ...account, storeName: store.name } };
    } else {
      const c = accounts.carrybee;
      const account: carrybee.CarrybeeAccount = {
        sandbox: Boolean(input.sandbox),
        clientId: field(input.clientId) || c?.clientId || "",
        clientSecret: keep(input.clientSecret, c?.clientSecret),
        clientContext: keep(input.clientContext, c?.clientContext),
        storeId,
        storeName: "",
        webhookSecret: c?.webhookSecret || newSecret(),
      };
      if (!account.clientId || !account.clientSecret || !account.clientContext) return { ok: false, error: "Add the Client ID, Client Secret and Client Context." };
      const r = await carrybee.check(account);
      if (!r.ok) return r;
      stores = r.value.stores;
      const store = stores.find((s) => String(s.id) === storeId);
      if (!store) return stores.length ? { ok: true, stores } : { ok: false, error: "The keys work, but this CarryBee account has no store yet. Add one in the CarryBee panel first." };
      if (!store.approved) return { ok: false, error: store.rejected ? `CarryBee rejected “${store.name}”. Fix it in the CarryBee panel, or pick another store.` : `CarryBee hasn't approved “${store.name}” yet, so it can't send parcels. Pick an approved store.` };
      next = { ...accounts, carrybee: { ...account, storeName: store.name } };
    }
  }
  if (!next.defaults.courier) next.defaults = { ...next.defaults, courier: id };
  try {
    await saveAccounts(next);
  } catch (error) {
    return failed(error) as { ok: false; error: string };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, view: await couriersView(), message };
}

export async function disconnectCourier(courier: CourierId): Promise<{ ok: true; view: CouriersView } | { ok: false; error: string }> {
  await requireAdmin();
  const id = courierOf(courier);
  if (!id) return { ok: false, error: "Pick a courier." };
  const { accounts } = await openAccounts();
  const next: CourierAccounts = { ...accounts, [id]: undefined };
  if (next.defaults.courier === id) next.defaults = { ...next.defaults, courier: (["steadfast", "pathao", "carrybee"] as const).find((c) => c !== id && next[c]) ?? "" };
  try {
    await saveAccounts(next);
  } catch (error) {
    return failed(error) as { ok: false; error: string };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, view: await couriersView() };
}

export async function saveCourierDefaults(input: { courier: string; weightKg: number }): Promise<{ ok: true; view: CouriersView } | { ok: false; error: string }> {
  await requireAdmin();
  const { accounts } = await openAccounts();
  const courier = courierOf(input?.courier);
  if (courier && !accounts[courier]) return { ok: false, error: `${COURIER_NAME[courier].en} isn't connected.` };
  const weightKg = Math.round(Number(input?.weightKg) * 10) / 10;
  if (!(weightKg >= 0.1 && weightKg <= 25)) return { ok: false, error: "Give a weight between 0.1 and 25 kg." };
  try {
    await saveAccounts({ ...accounts, defaults: { courier: courier ?? "", weightKg } });
  } catch (error) {
    return failed(error) as { ok: false; error: string };
  }
  return { ok: true, view: await couriersView() };
}

/** What the booking dialog sends; the server checks it all again. */
export interface BookParcelInput {
  orderId: string;
  courier: CourierId;
  name: string;
  phone: string;
  address: string;
  cod: number;
  weightKg: number;
  note: string;
  cityId?: number;
  zoneId?: number;
  areaId?: number;
}

const placeId = (value: unknown) => {
  const n = Math.floor(Number(value));
  return n > 0 && n < 1e9 ? n : undefined;
};

/** Books the order's parcel with a courier. A booked parcel is never booked again here until it's cancelled or removed. */
export async function bookParcel(input: BookParcelInput): Promise<Saved> {
  await requireAdmin();
  const id = courierOf(input?.courier);
  if (!id) return { ok: false, error: "Pick a courier." };
  const order = await loadOrder(String(input.orderId));
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "new") return { ok: false, error: "Confirm the order before booking a courier." };
  if (order.status === "delivered" || order.status === "cancelled") return { ok: false, error: `This order is already ${order.status}.` };
  if (isActive(order.shipment)) return { ok: false, error: `It's already booked with ${COURIER_NAME[order.shipment.courier].en} (${order.shipment.consignmentId}). Cancel or remove that parcel first.` };

  const name = field(input.name, 100);
  const phone = normalizePhone(String(input.phone ?? ""));
  const address = field(input.address, 400).replace(/\s+/g, " ");
  const cod = Number(input.cod);
  const weightKg = Math.round(Number(input.weightKg) * 10) / 10;
  if (name.length < 3) return { ok: false, error: "Give the customer's name (at least 3 letters)." };
  if (id === "pathao" && name.length > 64) return { ok: false, error: "Pathao takes names up to 64 letters. Shorten it." };
  if (!phone) return { ok: false, error: "Enter a Bangladeshi mobile number, like 01712345678." };
  if (address.length < 10) return { ok: false, error: "Give the full address (at least 10 characters)." };
  if (address.length > 220) return { ok: false, error: "Shorten the address to 220 characters; couriers cut longer ones." };
  if (!Number.isInteger(cod) || cod < 0 || cod > 500_000) return { ok: false, error: "The amount to collect must be whole taka, 0 if it's paid." };
  if (id === "pathao" ? !(weightKg >= 0.5 && weightKg <= 10) : !(weightKg >= 0.1 && weightKg <= 25)) return { ok: false, error: id === "pathao" ? "Pathao takes 0.5 to 10 kg." : "Give a weight between 0.1 and 25 kg." };
  const accounts = await loadAccounts();
  if (!accounts[id]) return { ok: false, error: `Connect ${COURIER_NAME[id].en} in Settings › Couriers first.` };
  const [cityId, zoneId, areaId] = [placeId(input.cityId), placeId(input.zoneId), placeId(input.areaId)];
  if (placeRequired(id) && (!cityId || !zoneId)) return { ok: false, error: `Pick the city and zone for ${COURIER_NAME[id].en}.` };
  if (cityId && !zoneId) return { ok: false, error: "Pick the zone too, or neither." };

  // One booking at a time per order: a dialog closed and reopened, or two people, mustn't make two parcels. The mark is
  // set before the courier is called and cleared after; a stale one (a crash mid-booking) lapses after two minutes.
  const started = Date.now();
  if (order.bookingSince && started - Date.parse(order.bookingSince) < 120_000) {
    return { ok: false, error: "This order is being booked right now. Wait a minute and reload. If no parcel shows, check the courier's panel before booking again." };
  }
  try {
    await saveOrder({ ...order, bookingSince: new Date(started).toISOString() });
  } catch (error) {
    return failed(error);
  }
  const unlock = async () => {
    const current = await loadOrder(order.id).catch(() => null);
    if (current?.bookingSince) await saveOrder({ ...current, bookingSince: undefined }).catch(() => {});
  };

  // Each parcel needs its own invoice: the order number, then MT-…-2, -3 for parcels booked again.
  const used = (order.pastShipments?.length ?? 0) + (order.shipment ? 1 : 0);
  const invoice = used ? `${order.no}-${used + 1}` : order.no;
  const result = await bookWithCourier(accounts, id, {
    invoice,
    name,
    phone,
    address,
    cod,
    note: field(input.note, 300),
    description: order.items.map((item) => `${item.name} ${item.unit} × ${item.qty}`).join(", "),
    quantity: order.items.reduce((sum, item) => sum + item.qty, 0),
    weightKg,
    ...(needsPlace(id) ? { cityId, zoneId, areaId } : {}),
  });
  if (!result.ok) {
    await unlock();
    return result;
  }

  const now = new Date().toISOString();
  const booked = result.value;
  const shipment: Shipment = {
    courier: id,
    consignmentId: booked.consignmentId,
    ...(booked.trackingCode ? { trackingCode: booked.trackingCode } : {}),
    ...((booked.trackingUrl ?? trackingUrl(id, booked.consignmentId, phone)) ? { trackingUrl: booked.trackingUrl ?? trackingUrl(id, booked.consignmentId, phone) } : {}),
    invoice,
    cod,
    ...(booked.fee !== undefined ? { fee: booked.fee } : {}),
    status: booked.status,
    stage: stageOf(id, booked.status) ?? "booked",
    bookedAt: now,
    updatedAt: now,
    events: [{ at: now, status: booked.status }],
  };
  // The courier took a few seconds: save onto the order as it is now, not as it was.
  const latest = (await loadOrder(order.id)) ?? order;
  try {
    await saveOrder({ ...latest, bookingSince: undefined, shipment, pastShipments: [...(latest.pastShipments ?? []), ...(latest.shipment ? [latest.shipment] : [])] });
    await indexShipment(order.id, shipment);
  } catch (error) {
    console.error("bookParcel: save", error);
    return { ok: false, error: `${COURIER_NAME[id].en} booked it (${booked.consignmentId}) but the order couldn't be updated. Add that ID with “Add tracking by hand” so it isn't booked twice.` };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** A parcel booked in the courier's own panel, linked so its status shows here (and updates, if that courier is connected). */
export async function linkParcel(input: { orderId: string; courier: CourierId; consignmentId: string; trackingCode: string }): Promise<Saved> {
  await requireAdmin();
  const id = courierOf(input?.courier);
  if (!id) return { ok: false, error: "Pick a courier." };
  const consignmentId = field(input.consignmentId, 60).replace(/\s+/g, "");
  const trackingCode = field(input.trackingCode, 60).replace(/\s+/g, "");
  if (!/^[\w-]{3,60}$/.test(consignmentId)) return { ok: false, error: "Enter the consignment ID as the courier shows it." };
  const order = await loadOrder(String(input.orderId));
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "cancelled") return { ok: false, error: "This order is cancelled." };
  if (order.status === "new") return { ok: false, error: "Confirm the order first." };
  if (isActive(order.shipment)) return { ok: false, error: "It already has a parcel. Remove that one first." };

  const now = new Date().toISOString();
  const shipment: Shipment = {
    courier: id,
    consignmentId,
    ...(trackingCode ? { trackingCode } : {}),
    ...(trackingUrl(id, consignmentId, order.customer.phone) ? { trackingUrl: trackingUrl(id, consignmentId, order.customer.phone) } : {}),
    invoice: order.no,
    cod: paymentIsCash(order.payment) ? order.total : 0,
    status: "linked",
    stage: "booked",
    bookedAt: now,
    updatedAt: now,
    manual: true,
    events: [{ at: now, status: "linked", note: "Added by hand" }],
  };
  const linked: Order = { ...order, shipment, pastShipments: [...(order.pastShipments ?? []), ...(order.shipment ? [order.shipment] : [])] };
  try {
    await saveOrder(linked);
    await indexShipment(order.id, shipment);
  } catch (error) {
    return failed(error);
  }
  // Its real status, where the courier is connected; a wrong ID shows up here too.
  const accounts = await loadAccounts();
  if (accounts[id]) {
    const synced = await syncShipment(linked, accounts);
    if (!synced.ok) {
      revalidatePath("/admin", "layout");
      return { ok: false, error: `Linked, but ${synced.error}` };
    }
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Asks the courier where the order's parcel is now. */
export async function refreshParcel(orderId: string): Promise<{ ok: true; changed: boolean } | { ok: false; error: string }> {
  await requireAdmin();
  const order = await loadOrder(String(orderId));
  if (!order?.shipment) return { ok: false, error: "This order has no parcel." };
  const before = JSON.stringify(order.shipment);
  const synced = await syncShipment(order, await loadAccounts());
  if (!synced.ok) return synced;
  const changed = JSON.stringify(synced.order.shipment) !== before;
  if (changed) revalidatePath("/admin", "layout");
  return { ok: true, changed };
}

/**
 * Every parcel still on its way, asked about at once, for when webhooks aren't set up or missed something. A few at a
 * time, newest first, so a long list doesn't hit the couriers' limits.
 */
export async function refreshParcels(): Promise<{ ok: true; checked: number; changed: number; failed: number; more: boolean } | { ok: false; error: string }> {
  await requireAdmin();
  const accounts = await loadAccounts();
  // The ones asked about longest ago first, so pressing again works through the rest.
  const lastAsked = (o: Order) => Date.parse(o.shipment!.checkedAt ?? o.shipment!.updatedAt) || 0;
  const open = (await loadAllOrders())
    .filter((o) => o.shipment && o.status !== "cancelled" && !FINAL_STAGES.includes(o.shipment.stage) && accounts[o.shipment.courier])
    .sort((a, b) => lastAsked(a) - lastAsked(b));
  const batch = open.slice(0, 24);
  let changed = 0;
  let failedCount = 0;
  let checked = 0;
  // Stops starting new ones after 30 seconds, so a slow courier can't run the page out of time.
  const deadline = Date.now() + 30_000;
  for (let i = 0; i < batch.length && Date.now() < deadline; i += 6) {
    checked += batch.slice(i, i + 6).length;
    await Promise.all(
      batch.slice(i, i + 6).map(async (order) => {
        const before = JSON.stringify(order.shipment);
        const synced = await syncShipment(order, accounts).catch(() => null);
        if (!synced?.ok) failedCount++;
        else if (JSON.stringify(synced.order.shipment) !== before) changed++;
      }),
    );
  }
  if (changed) revalidatePath("/admin", "layout");
  return { ok: true, checked, changed, failed: failedCount, more: open.length > checked };
}

/**
 * CarryBee takes a cancellation by API but carries it out in the background, and refuses it once the parcel is picked
 * up. So the parcel shows "cancel requested" until CarryBee confirms (by webhook or a status check); only then can the
 * order be booked again or cancelled.
 */
export async function cancelParcel(orderId: string, reason: string): Promise<Saved> {
  await requireAdmin();
  const order = await loadOrder(String(orderId));
  const shipment = order?.shipment;
  if (!order || !isActive(shipment)) return { ok: false, error: "This order has no booked parcel." };
  if (!canCancelByApi(shipment.courier)) return { ok: false, error: `Cancel it in the ${COURIER_NAME[shipment.courier].en} panel, then refresh its status here.` };
  if (shipment.stage !== "booked") return { ok: false, error: "The courier has already picked it up, so it can't be cancelled from here. Ask the courier to return it." };
  const r = await cancelWithCourier(await loadAccounts(), shipment, field(reason, 190));
  if (!r.ok) return r;
  try {
    await recordNews(order, { status: "cancel_requested", stage: null, note: field(reason, 190) || "Cancel asked from the admin", current: false });
  } catch (error) {
    return failed(error);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Forgets the order's parcel here (a wrong link, or one cancelled in the courier's panel), so it can be booked again.
 * The courier's own record isn't touched.
 */
export async function removeParcel(orderId: string): Promise<Saved> {
  await requireAdmin();
  const order = await loadOrder(String(orderId));
  if (!order?.shipment) return { ok: false, error: "This order has no parcel." };
  try {
    await saveOrder({ ...order, shipment: undefined, pastShipments: [...(order.pastShipments ?? []), order.shipment] });
  } catch (error) {
    return failed(error);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Cities, zones and areas change rarely: a day's cache per courier account and level saves calls. */
const cachedPlaces = unstable_cache(
  async (courier: CourierId, _account: string, cityId: number, zoneId: number) => {
    const r = await listPlaces(await loadAccounts(), courier, cityId || undefined, zoneId || undefined);
    // Thrown, so a failure isn't cached.
    if (!r.ok) throw new Error(r.error);
    return r.value;
  },
  ["courier-places"],
  { revalidate: 86_400 },
);

export async function courierPlaces(courier: CourierId, cityId?: number, zoneId?: number): Promise<{ ok: true; places: Place[] } | { ok: false; error: string }> {
  await requireAdmin();
  const id = courierOf(courier);
  if (!id || !needsPlace(id)) return { ok: true, places: [] };
  const accounts = await loadAccounts();
  const account = accounts[id];
  if (!account) return { ok: false, error: `${COURIER_NAME[id].en} isn't connected.` };
  try {
    const key = `${account.sandbox ? "sandbox" : "live"}:${account.clientId}`;
    return { ok: true, places: await cachedPlaces(id, key, placeId(cityId) ?? 0, placeId(zoneId) ?? 0) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't load the list." };
  }
}

/** The courier's guess at the city and zone from the address, to start the pickers on. */
export async function guessPlace(courier: CourierId, address: string): Promise<{ cityId: number; zoneId: number } | null> {
  await requireAdmin();
  const id = courierOf(courier);
  if (!id) return null;
  return detectPlace(await loadAccounts(), id, field(address, 300)).catch(() => null);
}

/* Customers */

/**
 * A one-time link to choose a new password, for a customer who asked on WhatsApp: the team sends it to the account's
 * own number (the button opens WhatsApp with it), so opening it proves the number is theirs. Lasts a day.
 */
export async function createResetLink(rawPhone: string): Promise<{ ok: true; url: string; whatsapp: string } | { ok: false; error: string }> {
  await requireAdmin();
  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone) return { ok: false, error: "Enter a Bangladeshi mobile number, like 01712345678." };
  try {
    const url = absolute(`/r/${await createReset(phone, "whatsapp", "bn", 24 * 60)}`);
    return { ok: true, url, whatsapp: `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(resetWhatsApp(url))}` };
  } catch (error) {
    return failed(error) as { ok: false; error: string };
  }
}
