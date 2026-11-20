import { findProduct, getProducts } from "@/lib/data";
import { OG_SIZE, productCard } from "@/lib/og";
import { STORE_LANG } from "@/lib/types";

/** The picture when a product is shared: its photo, name and price. */
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const alt = "Matir Taan · মাটির টান";
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getProducts()).filter((p) => p.active).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const product = await findProduct((await params).slug);
  if (!product) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await productCard(product, STORE_LANG)), { headers: { "Content-Type": contentType } });
}
