import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyBox } from "@/components/buy-box";
import { CashIcon, LeafIcon, TruckIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import { ratingLabel, ReviewsSection } from "@/components/reviews";
import { Stars } from "@/components/stars";
import { getProducts, getSettings } from "@/lib/data";
import { STORE_NAME, t } from "@/lib/i18n";
import { getApprovedReviews, summarize } from "@/lib/reviews";
import type { Lang } from "@/lib/types";
import { variantsOf } from "@/lib/variants";

/** Products added later render on first visit, then stay static. */
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await getProducts()).filter((p) => p.active).map((p) => ({ slug: p.slug }));
}

async function find(slug: string) {
  return (await getProducts()).find((p) => p.slug === slug && p.active);
}

export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const product = await find(slug);
  if (!product) return {};
  const l = lang as Lang;
  return {
    title: product.name[l],
    description: product.description[l],
    openGraph: product.image ? { images: [product.image] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const product = await find(slug);
  if (!product) notFound();
  const d = t(lang);
  const [settings, reviews] = await Promise.all([getSettings(), getApprovedReviews(product.id).catch(() => [])]);
  const summary = summarize(reviews);
  const inStock = variantsOf(product).some((v) => v.inStock);

  // "Inside Dhaka 1–2 days · Outside Dhaka 2–4 days", straight from the delivery settings.
  const deliveryTimes = settings.delivery.zones
    .filter((z) => z.active)
    .map((z) => `${z.name[lang]} ${z.time[lang]}`)
    .join(" · ");
  const promises = [
    { icon: CashIcon, title: d.codTitle, body: d.codBody },
    { icon: TruckIcon, title: d.deliveryTime, body: deliveryTimes },
    { icon: LeafIcon, title: d.pureTitle, body: d.pureBody },
  ];

  return (
    <div className="container-page flex flex-col gap-12 sm:gap-16 sm:pt-5">
      <div className="flex flex-col gap-4 sm:gap-6">
        <nav aria-label="Breadcrumb" className="max-sm:hidden">
          <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
            <li>
              <Link href={`/${lang}`} className="transition-colors hover:text-fg-primary">
                {STORE_NAME[lang]}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{product.name[lang]}</li>
          </ol>
        </nav>

        {/* Motherhood's columns: the photo a little wider than the buy box. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          {/* Phones: edge-to-edge photo. */}
          <div className="-mx-4 self-start overflow-hidden bg-muted sm:mx-0 sm:rounded-xl lg:sticky lg:top-28">
            <ProductMedia product={product} lang={lang} className={inStock ? "" : "opacity-55"} />
          </div>

          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3">
              <h1 className="text-h2 lg:text-h1">{product.name[lang]}</h1>
              {summary.count > 0 && (
                <a href="#reviews" className="flex w-fit items-center gap-2 rounded-sm hover:underline">
                  <Stars value={summary.average} label={ratingLabel(summary, lang, d)} />
                  <span className="font-display text-body-md font-medium text-fg-secondary">{ratingLabel(summary, lang, d)}</span>
                </a>
              )}
            </div>

            <BuyBox product={product} lang={lang} d={d} />

            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {promises.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-fg-brand">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-label-md">{title}</span>
                    <span className="font-display text-body-sm font-medium text-fg-secondary">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            {product.description[lang] && (
              <div className="flex flex-col gap-2">
                <h2 className="text-h4">{d.aboutProduct}</h2>
                <p className="text-body-lg whitespace-pre-line text-fg-secondary">{product.description[lang]}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewsSection productId={product.id} reviews={reviews} summary={summary} lang={lang} d={d} />
    </div>
  );
}
