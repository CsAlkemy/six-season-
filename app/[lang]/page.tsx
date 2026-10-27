import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/data";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/** Motherhood's collection page: a title, one line about it, then the grid. */
export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = (await params).lang as Lang;
  const d = t(lang);
  const products = (await getProducts()).filter((p) => p.active);

  return (
    <div className="container-page flex flex-col gap-10 pt-10 sm:gap-14 sm:pt-16">
      <header className="flex max-w-180 flex-col gap-3">
        <h1 className="text-h2 sm:text-h1">{d.ourProducts}</h1>
        <p className="text-body-lg text-fg-secondary">{d.productsLead}</p>
      </header>
      {/* One card per row on phones, two then three on tablets, four on desktop; cards in a row share one height. */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} lang={lang} />
        ))}
      </div>
    </div>
  );
}
