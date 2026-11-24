import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/auth";
import { loadProducts } from "@/lib/data";
import { loadProductCosts } from "@/lib/product-costs";

export const metadata: Metadata = { title: "Product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  // The proxy already sends visitors to sign in; checked here too, as this page hands over the product's costs.
  await requireAdmin();
  const { id } = await params;
  const product = id === "new" ? null : (await loadProducts()).find((p) => p.id === id);
  if (product === undefined) notFound();
  const costs = product ? await loadProductCosts(product.id) : null;
  return <ProductForm product={product} costs={costs} key={product?.id ?? "new"} />;
}
