import { categoryOf } from "@/lib/categories";
import { getProducts } from "@/lib/data";
import { STORE_NAME } from "@/lib/i18n";
import { absolute, SITE_URL } from "@/lib/site";
import { type Lang, LANGS } from "@/lib/types";
import { photosOf, variantsOf } from "@/lib/variants";

const escape = (value: string) => value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const tag = (name: string, value: string | number) => `<${name}>${escape(String(value))}</${name}>`;
const taka = (amount: number) => `${amount.toFixed(2)} BDT`;

/**
 * The store's products as a Google Merchant Center feed (RSS 2.0 with Google's g: fields), one item per size, for
 * Merchant Center to fetch on a schedule: /feeds/google (English) or /feeds/google?lang=bn. Own-brand products have no
 * barcodes, hence identifier_exists. Delivery charges aren't in it: they depend on "inside Dhaka city", which a
 * feed can't say per area, so they're set in the Merchant Center account (Shipping and returns).
 */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("lang");
  const lang: Lang = LANGS.find((l) => l === asked) ?? "en";
  const products = (await getProducts()).filter((p) => p.active);

  const items = products.flatMap((product) => {
    const photos = photosOf(product).map(absolute);
    // Merchant Center won't take a product without a photo.
    if (!photos.length) return [];
    const variants = variantsOf(product);
    const category = categoryOf(product);
    return variants.map((v) => {
      const discounted = v.compareAt !== null && v.compareAt > v.price;
      const fields = [
        tag("g:id", `${product.id}-${v.id}`),
        tag("title", `${product.name[lang]} ${v.label[lang]}`.slice(0, 150)),
        tag("description", (product.description[lang] || product.name[lang]).slice(0, 5000)),
        tag("link", absolute(`/${lang}/p/${product.slug}`)),
        tag("g:image_link", photos[0]!),
        ...photos.slice(1, 11).map((url) => tag("g:additional_image_link", url)),
        tag("g:availability", v.inStock ? "in_stock" : "out_of_stock"),
        tag("g:price", taka(discounted ? v.compareAt! : v.price)),
        ...(discounted ? [tag("g:sale_price", taka(v.price))] : []),
        tag("g:condition", "new"),
        tag("g:brand", STORE_NAME[lang]),
        tag("g:identifier_exists", "no"),
        ...(variants.length > 1 ? [tag("g:item_group_id", product.id)] : []),
        ...(category ? [tag("g:product_type", category.name.en)] : []),
      ];
      return `<item>${fields.join("")}</item>`;
    });
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>${tag("title", STORE_NAME[lang])}${tag("link", SITE_URL)}${tag("description", `${STORE_NAME[lang]} products`)}${items.join("")}</channel></rss>`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
