import Link from "next/link";

import { COURIER_NAME, isActive } from "@/lib/couriers/meta";
import { type Dict, taka } from "@/lib/i18n";
import { paymentName } from "@/lib/payments";
import type { Lang, Order, OrderStatus } from "@/lib/types";

import { CheckIcon } from "../icons";

/** An order as its customer sees it, on the account page and the tracking page. */

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

/** Where to go after logging in: a page of this store in this language, never another site. */

/** Order cards, newest first. Each opens on `base` (the account page, or the tracking page) by its number. */
export function OrderList({ orders, lang, d, base }: { orders: Order[]; lang: Lang; d: Dict; base: "account" | "track" }) {
  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/${base}?order=${order.no}`}
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
  );
}

export function StatusBadge({ status, d }: { status: OrderStatus; d: Dict }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-caption ${BADGE[status]}`}>{d[STATUS_LABEL[status]]}</span>;
}

/** One order: where it is on its way, the courier's tracking, what's in it and where it's going. */
export function OrderDetail({ order, lang, d, back }: { order: Order; lang: Lang; d: Dict; back: { href: string; label: string } }) {
  const reached = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={back.href} className="text-body-sm text-fg-secondary underline hover:text-fg-brand">
        ← {back.label}
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
        {isActive(order.shipment) && order.status !== "cancelled" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-body-sm text-fg-secondary">
              {d.courier}: <span className="font-semibold text-fg-primary">{COURIER_NAME[order.shipment.courier][lang]}</span> · <span className="tabular-nums">{order.shipment.trackingCode ?? order.shipment.consignmentId}</span>
            </p>
            {order.shipment.trackingUrl && (
              <a href={order.shipment.trackingUrl} target="_blank" rel="noopener" className="btn-secondary h-11 px-5 text-label-md">
                {d.trackParcel}
              </a>
            )}
          </div>
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
          <p className="pt-2 text-body-sm text-fg-tertiary">{paymentName(order.payment, lang)}</p>
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
