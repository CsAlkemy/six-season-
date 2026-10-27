import Link from "next/link";

import { moveProduct } from "@/app/admin/actions";
import { ProductMedia } from "@/components/product-media";
import { loadProducts } from "@/lib/data";
import { taka } from "@/lib/i18n";

export default async function ProductsPage() {
  const products = await loadProducts();
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h2">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">Add product</Link>
      </div>
      <div className="card divide-y divide-border">
        {products.map((product, i) => (
          <div key={product.id} className="flex items-center gap-4 p-4">
            <ProductMedia product={product} lang="en" className="size-16! shrink-0 rounded-md [&_span]:hidden [&_svg]:size-6" />
            <div className="min-w-0 flex-1">
              <Link href={`/admin/products/${product.id}`} className="font-semibold hover:text-fg-brand">
                {product.name.en} <span className="font-normal text-fg-tertiary">· {product.name.bn}</span>
              </Link>
              <p className="text-body-sm text-fg-secondary">
                {product.unit.en} · {taka(product.price, "en")}
                {!product.inStock && <span className="ml-2 text-fg-error">Out of stock</span>}
                {!product.active && <span className="ml-2 text-fg-tertiary">Hidden</span>}
              </p>
            </div>
            <form action={moveProduct} className="flex gap-1">
              <input type="hidden" name="id" value={product.id} />
              <button name="dir" value="up" disabled={i === 0} className="grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30" aria-label="Move up">↑</button>
              <button name="dir" value="down" disabled={i === products.length - 1} className="grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30" aria-label="Move down">↓</button>
            </form>
            <Link href={`/admin/products/${product.id}`} className="btn-secondary h-9! px-4!">Edit</Link>
          </div>
        ))}
      </div>
    </>
  );
}
