import { findProduct, getProducts } from "@/lib/data";
import { OG_SIZE, productCard } from "@/lib/og";
import { type Lang, LANGS } from "@/lib/types";

/** The picture when a product is shared: its photo, name and price. */
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const alt = "মাটির টান · Matir Taan";
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getProducts()).filter((p) => p.active).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const product = LANGS.includes(lang as Lang) ? await findProduct(slug) : undefined;
  if (!product) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await productCard(product, lang as Lang)), { headers: { "Content-Type": contentType } });
}
