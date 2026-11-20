import { getProducts, getSettings } from "@/lib/data";
import { OG_SIZE, storeCard } from "@/lib/og";
import { homeSeo } from "@/lib/site";
import { STORE_LANG } from "@/lib/types";

/** The picture when the store is shared on Facebook, WhatsApp and the rest; product pages have their own. */
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const alt = "Matir Taan · মাটির টান";
export const revalidate = 3600;

export default async function Image() {
  const lang = STORE_LANG;
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  const card = await storeCard(
    products.filter((p) => p.active),
    lang,
    homeSeo(lang, settings.store.seo).description,
  );
  return new Response(new Uint8Array(card), { headers: { "Content-Type": contentType } });
}
