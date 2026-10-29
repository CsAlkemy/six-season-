import type { Metadata } from "next";

import { CreateOrder, type ProductOption } from "@/components/admin/create-order";
import { loadProducts, loadSettings } from "@/lib/data";
import { variantsOf } from "@/lib/variants";

export const metadata: Metadata = { title: "Create order" };

/** Orders keyed in by the team, for phone, WhatsApp and walk-in customers. */
export default async function NewOrderPage() {
  const [products, settings] = await Promise.all([loadProducts(), loadSettings()]);
  const options: ProductOption[] = products.flatMap((p) =>
    variantsOf(p).map((v) => ({ key: `${p.id}:${v.id}`, productId: p.id, variantId: v.id, name: p.name.en, nameBn: p.name.bn, size: v.label.en, price: v.price, stock: v.stock ?? null, inStock: v.inStock, image: p.image, active: p.active })),
  );
  return <CreateOrder options={options} zones={settings.delivery.zones.filter((z) => z.active)} methods={settings.payments.methods} />;
}
