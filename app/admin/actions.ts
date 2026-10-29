"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { deleteImages, putImage } from "@/lib/blob";
import { loadOrder, loadProducts, loadSettings, refreshStorefront, saveOrder, saveProducts, saveSettings } from "@/lib/data";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { canCancel, NEXT_STEP, withStatus } from "@/lib/orders";
import { createSession, passwordMatches, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { moveStock, summarize, withStock } from "@/lib/stock";
import { MAX_PHOTOS, SEASONS, type HomeSection, type Order, type Product, type Settings, type Text, type Tone, type Variant } from "@/lib/types";

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
/** Our own uploads (Blob, or the local folder in development) or the bundled stand-in photos; nothing else goes into a product or the hero. */
const isImage = (url: unknown): url is string => typeof url === "string" && /^(https:\/\/[^\s"]+|\/(images|local-uploads)\/[\w./-]+)$/.test(url);
const dropUploads = deleteImages;
const failed = (error: unknown): Saved => ({ ok: false, error: error instanceof Error ? error.message : "Couldn't save." });

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
  if (!canCancel(order.status)) return { ok: false, error: "It has already shipped, so it can't be cancelled." };
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

/* Products */

/** A photo for a product or the hero. The browser already shrank it to a WebP. */
export async function uploadImage(form: FormData): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const file = form.get("file");
  const folder = str(form, "folder") === "home" ? "home" : "products";
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return { error: "Upload an image under 4 MB." };
  try {
    return { url: await putImage(folder, file) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't upload." };
  }
}

/** What the product form posts; every field is checked again here. */
export interface ProductDraft {
  id: string;
  slug: string;
  name: Text;
  description: Text;
  images: string[];
  tone: Tone;
  seasons: string[];
  active: boolean;
  lowStockAt: number;
  variants: { id: string; label: Text; price: number; compareAt: number | null; stock: number }[];
}

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
    inStock: true,
    active: Boolean(draft.active),
    lowStockAt: Math.min(money(draft.lowStockAt), 9999),
  });

  try {
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
    // Home sections that listed it drop it too, so the settings page doesn't count a ghost.
    const settings = await loadSettings();
    if (settings.home.sections.some((sec) => sec.productIds.includes(product.id))) {
      await saveSettings({ ...settings, home: { ...settings.home, sections: settings.home.sections.map((sec) => ({ ...sec, productIds: sec.productIds.filter((id) => id !== product.id) })) } });
    }
  } catch (error) {
    return failed(error);
  }
  await dropUploads([...new Set([...(product.images ?? []), product.image ?? ""])].filter(Boolean));
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

  const methods = DEFAULT_SETTINGS.payments.methods.map((fallback) => {
    const m = raw.payments?.methods?.find((x) => x.id === fallback.id) ?? fallback;
    return {
      id: fallback.id,
      enabled: Boolean(m.enabled),
      account: String(m.account ?? "").replace(/[^\d+]/g, "").slice(0, 20),
      accountType: String(m.accountType ?? "").trim().slice(0, 30),
      maxAmount: money(m.maxAmount),
      instructions: text(m.instructions, 300),
    };
  });
  if (!methods.some((m) => m.enabled)) return { ok: false, error: "Keep at least one payment method on." };
  const noNumber = methods.find((m) => m.enabled && m.id !== "cod" && !m.account);
  if (noNumber) return { ok: false, error: `Add the ${noNumber.id} number before switching it on.` };

  const productIds = new Set((await loadProducts()).map((p) => p.id));
  const hero = raw.home?.hero ?? DEFAULT_SETTINGS.home.hero;
  const sections: HomeSection[] = (raw.home?.sections ?? []).slice(0, 10).map((section, i) => ({
    id: slugify(String(section.id ?? "")) || `section-${i + 1}`,
    enabled: Boolean(section.enabled),
    title: text(section.title, 80),
    subtitle: text(section.subtitle, 200),
    productIds: [...new Set((section.productIds ?? []).map(String))].filter((id) => productIds.has(id)).slice(0, 24),
  }));
  if (sections.some((s) => !s.title.bn || !s.title.en)) return { ok: false, error: "Give every home section a title in both languages." };
  const heroTitle = text(hero.title, 120);
  if (hero.enabled && (!heroTitle.bn || !heroTitle.en)) return { ok: false, error: "Give the hero a title in both languages, or switch it off." };

  const store = raw.store ?? DEFAULT_SETTINGS.store;
  const previous = await loadSettings();
  const settings: Settings = {
    store: {
      phone: String(store.phone ?? "").trim().slice(0, 30),
      whatsapp: String(store.whatsapp ?? "").replace(/\D/g, "").slice(0, 15),
      email: String(store.email ?? "").trim().slice(0, 120),
      address: text(store.address, 240),
      announcement: text(store.announcement, 120),
    },
    delivery: { zones },
    payments: { methods },
    home: {
      hero: {
        enabled: Boolean(hero.enabled),
        title: heroTitle,
        subtitle: text(hero.subtitle, 300),
        cta: text(hero.cta, 40),
        image: isImage(hero.image) ? hero.image : null,
      },
      sections,
    },
  };
  try {
    await saveSettings(settings);
  } catch (error) {
    return failed(error);
  }
  const oldHero = previous.home.hero.image;
  if (oldHero && oldHero !== settings.home.hero.image) await dropUploads([oldHero]);
  refreshStorefront();
  return { ok: true };
}
