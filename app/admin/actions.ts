"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG, loadOrder, loadProducts, saveOrder, saveProducts, saveSettings } from "@/lib/data";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { createSession, passwordMatches, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { ORDER_STATUSES, SEASONS, type OrderStatus, type Product, type Settings, type Text, type Tone } from "@/lib/types";

/** Storefront pages are static; expire them so the change shows on the next visit. */
function refreshStorefront() {
  updateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

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

export async function updateOrderStatus(form: FormData) {
  await requireAdmin();
  const status = str(form, "status") as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) return;
  const order = await loadOrder(str(form, "id", 200));
  if (!order) return;
  await saveOrder({ ...order, status });
  revalidatePath("/admin");
}

export async function saveProduct(_: string | null, form: FormData): Promise<string | null> {
  await requireAdmin();
  const products = await loadProducts();
  const existingId = str(form, "id", 80);
  const existing = products.find((p) => p.id === existingId);

  const name = { bn: str(form, "name.bn", 120), en: str(form, "name.en", 120) };
  if (!name.bn || !name.en) return "Add the name in both languages.";
  const slug = slugify(str(form, "slug", 80) || name.en);
  if (!slug) return "Add a URL slug in English letters.";
  if (products.some((p) => p.slug === slug && p.id !== existing?.id)) return `Another product already uses "${slug}".`;

  const id = existing?.id ?? `${slug}-${crypto.randomUUID().slice(0, 4)}`;
  let image = existing?.image ?? null;

  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return "Upload an image under 4 MB.";
    const uploaded = await put(`products/${id}.${file.type.split("/")[1] ?? "jpg"}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    if (image) await del(image).catch(() => {});
    image = uploaded.url;
  } else if (form.get("removeImage") === "on" && image) {
    await del(image).catch(() => {});
    image = null;
  }

  const compareAt = money(form.get("compareAt"));
  const product: Product = {
    id,
    slug,
    name,
    unit: { bn: str(form, "unit.bn", 40), en: str(form, "unit.en", 40) },
    description: { bn: str(form, "description.bn"), en: str(form, "description.en") },
    price: money(form.get("price")),
    compareAt: compareAt > 0 ? compareAt : null,
    image,
    tone: (["butter", "mustard", "soil", "leaf"].includes(str(form, "tone")) ? str(form, "tone") : "soil") as Tone,
    seasons: SEASONS.filter((s) => form.getAll("seasons").includes(s)),
    inStock: form.get("inStock") === "on",
    active: form.get("active") === "on",
  };

  try {
    await saveProducts(existing ? products.map((p) => (p.id === id ? product : p)) : [...products, product]);
  } catch (error) {
    return error instanceof Error ? error.message : "Couldn't save.";
  }
  refreshStorefront();
  redirect("/admin/products");
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  const products = await loadProducts();
  const product = products.find((p) => p.id === str(form, "id", 80));
  if (!product) return;
  if (product.image) await del(product.image).catch(() => {});
  await saveProducts(products.filter((p) => p.id !== product.id));
  refreshStorefront();
  redirect("/admin/products");
}

/** Moves a product one place up or down; the storefront lists them in this order. */
export async function moveProduct(form: FormData) {
  await requireAdmin();
  const products = await loadProducts();
  const from = products.findIndex((p) => p.id === str(form, "id", 80));
  const to = from + (str(form, "dir") === "up" ? -1 : 1);
  if (from < 0 || to < 0 || to >= products.length) return;
  [products[from], products[to]] = [products[to]!, products[from]!];
  await saveProducts(products);
  refreshStorefront();
}

/** The settings form posts the whole object as JSON; every field is re-checked here. */
export async function saveStoreSettings(json: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  let raw: Settings;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "Couldn't read the form." };
  }

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

  const store = raw.store ?? DEFAULT_SETTINGS.store;
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
  };
  try {
    await saveSettings(settings);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't save." };
  }
  refreshStorefront();
  return { ok: true };
}
