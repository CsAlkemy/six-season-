import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { loadProducts } from "@/lib/data";

export const metadata: Metadata = { title: "Product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const product = id === "new" ? null : (await loadProducts()).find((p) => p.id === id);
  if (product === undefined) notFound();
  return <ProductForm product={product} key={product?.id ?? "new"} />;
}
