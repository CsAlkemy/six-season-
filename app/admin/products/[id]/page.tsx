import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { loadProducts } from "@/lib/data";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const product = id === "new" ? null : (await loadProducts()).find((p) => p.id === id);
  if (product === undefined) notFound();
  return (
    <>
      <h1 className="mb-6 text-h2">{product ? product.name.en : "New product"}</h1>
      <ProductForm product={product} />
    </>
  );
}
