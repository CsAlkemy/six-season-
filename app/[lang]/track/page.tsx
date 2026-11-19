import type { Metadata } from "next";

import { OrderDetail, OrderList } from "@/components/account/orders";
import { TrackForm } from "@/components/account/track-form";
import { TruckIcon } from "@/components/icons";
import { accessibleOrders, currentCustomer } from "@/lib/customers";
import { t } from "@/lib/i18n";
import type { Lang, Order } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/track">): Promise<Metadata> {
  return { title: t((await params).lang as Lang).trackOrder, robots: { index: false } };
}

/**
 * Track an order, linked from the footer on every page: the order number and the mobile it was placed with find it
 * (lib/customers.ts findOrderByNo, limited per number), and from then on this browser can open it. The orders this
 * visitor can already open are listed under the form. An order opens here by its number (`?order=MT-…`), and only one
 * this visitor may see.
 */
export default async function TrackPage({ params, searchParams }: PageProps<"/[lang]/track">) {
  const lang = (await params).lang as Lang;
  const { order: wanted } = (await searchParams) as { order?: string };
  const d = t(lang);
  const customer = await currentCustomer();
  const orders = await accessibleOrders(customer).catch(() => [] as Order[]);

  const order = wanted ? orders.find((o) => o.no === wanted || o.id === wanted) : undefined;
  if (order) {
    return (
      <div className="container-page pt-8 sm:pt-12">
        <OrderDetail order={order} lang={lang} d={d} back={{ href: `/${lang}/track`, label: d.trackOrder }} />
      </div>
    );
  }

  return (
    <div className="container-page pt-8 sm:pt-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-sage-soft text-fg-sage">
            <TruckIcon className="size-7" />
          </span>
          <h1 className="text-h2 sm:text-h1">{d.trackOrder}</h1>
        </div>
        <section className="card p-6 sm:p-8">
          <TrackForm lang={lang} />
        </section>
      </div>
      {orders.length > 0 && (
        <section className="mx-auto mt-10 max-w-3xl">
          <h2 className="mb-4 text-h4">{customer ? d.myOrders : d.deviceOrders}</h2>
          <OrderList orders={orders} lang={lang} d={d} base="track" />
        </section>
      )}
    </div>
  );
}
