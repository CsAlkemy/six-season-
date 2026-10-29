import type { Metadata } from "next";
import Link from "next/link";

import { AuthForms } from "@/components/account/auth-forms";
import { ProfileForm } from "@/components/account/profile-form";
import { CheckIcon } from "@/components/icons";
import { currentCustomer, listCustomerOrders } from "@/lib/customers";
import { loadOrder } from "@/lib/data";
import { type Dict, PAYMENT_LABEL, t, taka } from "@/lib/i18n";
import type { Lang, Order, OrderStatus } from "@/lib/types";

import { logout } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  return { title: t((await params).lang as Lang).account, robots: { index: false } };
}

const STEPS = ["new", "confirmed", "packing", "shipped", "delivered"] as const;

const STATUS_LABEL: Record<OrderStatus, keyof Dict> = {
  new: "statusNew",
  confirmed: "statusConfirmed",
  packing: "statusPacking",
  shipped: "statusShipped",
  delivered: "statusDelivered",
  cancelled: "statusCancelled",
};

const BADGE: Record<OrderStatus, string> = {
  new: "bg-sage-soft text-fg-sage",
  confirmed: "bg-brand-soft text-fg-brand",
  packing: "bg-butter-100 text-soil-700",
  shipped: "bg-mustard-100 text-soil-700",
  delivered: "bg-brand text-fg-inverse",
  cancelled: "bg-muted text-fg-tertiary",
};

const date = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" });

/** Profile, order history and tracking all live here; the footer stays free of account links. */
export default async function AccountPage({ params, searchParams }: PageProps<"/[lang]/account">) {
  const lang = (await params).lang as Lang;
  const { order: orderId } = (await searchParams) as { order?: string };
  const d = t(lang);
  const customer = await currentCustomer();

  if (!customer) {
    return (
      <div className="container-page pt-8 sm:pt-12">
        <h1 className="mb-8 text-center text-h2 sm:text-h1">{d.account}</h1>
        <AuthForms lang={lang} />
      </div>
    );
  }

  if (orderId) {
    const order = await loadOrder(orderId).catch(() => null);
    if (order?.customer.phone === customer.phone) {
      return (
        <div className="container-page pt-8 sm:pt-12">
          <OrderDetail order={order} lang={lang} d={d} />
        </div>
      );
    }
  }

  const orders = await listCustomerOrders(customer.phone).catch(() => []);

  return (
    <div className="container-page pt-8 sm:pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 sm:text-h1">{customer.name || d.account}</h1>
          <p className="mt-1 text-fg-secondary tabular-nums">{customer.phone}</p>
        </div>
        <form action={logout}>
          <input type="hidden" name="lang" value={lang} />
          <button className="btn-secondary">{d.logout}</button>
        </form>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-4 text-h4">{d.myOrders}</h2>
          {orders.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-fg-secondary">{d.noOrders}</p>
              <Link href={`/${lang}#products`} className="btn-primary mt-6">
                {d.continueShopping}
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/${lang}/account?order=${order.id}`}
                    className="card flex flex-wrap items-center gap-x-4 gap-y-1 p-5 transition hover:border-border-brand hover:shadow-hover"
                  >
                    <span className="font-display text-h4">{order.no}</span>
                    <StatusBadge status={order.status} d={d} />
                    <span className="ml-auto font-display text-h4">{taka(order.total, lang)}</span>
                    <span className="w-full text-body-sm text-fg-tertiary">
                      {date(order.createdAt, lang)} · {order.items.map((item) => item.name).join(", ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ProfileForm lang={lang} name={customer.name} address={customer.address} hasPassword={Boolean(customer.password)} />
      </div>
    </div>
  );
}

function StatusBadge({ status, d }: { status: OrderStatus; d: Dict }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-caption ${BADGE[status]}`}>{d[STATUS_LABEL[status]]}</span>;
}

function OrderDetail({ order, lang, d }: { order: Order; lang: Lang; d: Dict }) {
  const reached = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/${lang}/account`} className="text-body-sm text-fg-secondary underline hover:text-fg-brand">
        ← {d.backToOrders}
      </Link>
      <div className="mt-4 mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-h2">{order.no}</h1>
        <StatusBadge status={order.status} d={d} />
        <span className="w-full text-fg-tertiary">{date(order.createdAt, lang)}</span>
      </div>

      <section className="card p-6">
        <h2 className="mb-5 text-h4">{d.trackOrder}</h2>
        {order.status === "cancelled" ? (
          <p className="text-fg-secondary">{d.statusCancelled}</p>
        ) : (
          <ol className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i <= reached;
              return (
                <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 ${i < reached ? "bg-brand" : "bg-border"}`} aria-hidden />
                  )}
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full border-2 ${done ? "border-brand bg-brand text-fg-inverse" : "border-border-strong bg-surface"}`}
                  >
                    {done && <CheckIcon className="size-4" />}
                  </span>
                  <span className={`pt-1 ${i === reached ? "font-semibold" : done ? "" : "text-fg-tertiary"}`}>{d[STATUS_LABEL[step]]}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="card mt-6 divide-y divide-border">
        <h2 className="p-6 pb-4 text-h4">{d.items}</h2>
        {order.items.map((item, i) => (
          <div key={`${item.productId}:${item.variantId ?? i}`} className="flex justify-between gap-4 px-6 py-3">
            <span>
              {item.name} <span className="text-fg-tertiary">· {item.unit} × {item.qty}</span>
            </span>
            <span className="font-display font-semibold">{taka(item.price * item.qty, lang)}</span>
          </div>
        ))}
        <div className="space-y-2 p-6">
          <Row label={d.subtotal} value={taka(order.subtotal, lang)} />
          <Row label={d.delivery} value={order.deliveryFee === 0 ? d.free : taka(order.deliveryFee, lang)} />
          <Row label={d.total} value={taka(order.total, lang)} strong />
          <p className="pt-2 text-body-sm text-fg-tertiary">{PAYMENT_LABEL[order.payment.method][lang]}</p>
        </div>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="mb-2 text-h4">{d.deliveryArea}</h2>
        <p className="font-semibold">{order.customer.name}</p>
        <p className="whitespace-pre-line text-fg-secondary">{order.customer.address}</p>
        <p className="text-fg-tertiary">{order.zone.name}</p>
      </section>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-h4" : "text-fg-secondary"}`}>
      <span>{label}</span>
      <span className={strong ? "font-display" : "font-display font-semibold text-fg-primary"}>{value}</span>
    </div>
  );
}
