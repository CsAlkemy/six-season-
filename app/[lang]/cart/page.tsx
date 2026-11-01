import type { Metadata } from "next";

import { Checkout } from "@/components/checkout";
import { currentCustomer } from "@/lib/customers";
import { getProducts, getSettings } from "@/lib/data";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  return { title: t((await params).lang as Lang).checkout, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const lang = (await params).lang as Lang;
  const [products, settings, customer] = await Promise.all([getProducts(), getSettings(), currentCustomer()]);

  return (
    <div className="container-page pt-8 sm:pt-12">
      <h1 className="mb-8 text-h2 sm:text-h1">{t(lang).checkout}</h1>
      <Checkout
        lang={lang}
        products={products.map(({ blur: _blur, ...product }) => product)}
        delivery={settings.delivery}
        methods={settings.payments.methods}
        customer={customer && { name: customer.name, phone: customer.phone, address: customer.address }}
      />
    </div>
  );
}
