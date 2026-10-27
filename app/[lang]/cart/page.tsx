import type { Metadata } from "next";

import { Checkout } from "@/components/checkout";
import { getProducts, getSettings } from "@/lib/data";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  return { title: t((await params).lang as Lang).checkout, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const lang = (await params).lang as Lang;
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);

  return (
    <div className="container-page pt-8 sm:pt-12">
      <h1 className="mb-8 text-h2 sm:text-h1">{t(lang).checkout}</h1>
      <Checkout lang={lang} products={products} delivery={settings.delivery} methods={settings.payments.methods} />
    </div>
  );
}
