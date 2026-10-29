import Link from "next/link";

import { StatusSelect } from "@/components/admin/status-select";
import { hasBlob } from "@/lib/blob";
import { listOrders } from "@/lib/data";
import { PAYMENT_LABEL, taka } from "@/lib/i18n";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

const BADGE: Record<OrderStatus, string> = {
  new: "bg-sage text-fg-inverse",
  confirmed: "bg-brand-soft text-fg-brand",
  shipped: "bg-mustard-100 text-soil-700",
  delivered: "bg-sage-soft text-fg-sage",
  cancelled: "bg-muted text-fg-tertiary",
};

export default async function OrdersPage({ searchParams }: PageProps<"/admin">) {
  const { status, cursor } = (await searchParams) as { status?: OrderStatus; cursor?: string };
  const { items, cursor: next } = await listOrders(cursor);
  const orders = status ? items.filter((o) => o.status === status) : items;
  const count = (s: OrderStatus) => items.filter((o) => o.status === s).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h2">Orders</h1>
        <nav className="flex flex-wrap gap-2">
          <Tab href="/admin" active={!status} label={`All · ${items.length}`} />
          {ORDER_STATUSES.map((s) => (
            <Tab key={s} href={`/admin?status=${s}`} active={status === s} label={`${s} · ${count(s)}`} />
          ))}
        </nav>
      </div>

      {!hasBlob() && (
        <p className="card mb-6 p-4 text-body-sm">Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to receive orders.</p>
      )}
      {orders.length === 0 && <p className="card p-10 text-center text-fg-secondary">No orders here yet.</p>}

      <div className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-h4">{order.no}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-caption capitalize ${BADGE[order.status]}`}>{order.status}</span>
              <span className="text-body-sm text-fg-tertiary">
                {new Date(order.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}
              </span>
              <div className="ml-auto">
                <StatusSelect id={order.id} status={order.status} />
              </div>
            </div>
            <div className="mt-4 grid gap-4 text-body-sm md:grid-cols-3">
              <div>
                <p className="font-semibold">{order.customer.name}</p>
                <a href={`tel:${order.customer.phone}`} className="text-fg-brand underline">{order.customer.phone}</a>
                <p className="mt-1 whitespace-pre-line text-fg-secondary">{order.customer.address}</p>
                <p className="text-fg-tertiary">{order.zone.name}</p>
                {order.customer.note && <p className="mt-1 italic">“{order.customer.note}”</p>}
              </div>
              <ul className="space-y-1">
                {order.items.map((item, i) => (
                  <li key={`${item.productId}:${item.variantId ?? i}`} className="flex justify-between gap-2">
                    <span>{item.name} <span className="text-fg-tertiary">({item.unit}) × {item.qty}</span></span>
                    <span className="tabular-nums">{taka(item.price * item.qty, "en")}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 md:text-right">
                <p className="text-fg-secondary">Delivery {taka(order.deliveryFee, "en")}</p>
                <p className="text-h4">{taka(order.total, "en")}</p>
                <p>
                  {PAYMENT_LABEL[order.payment.method].en}
                  {order.payment.trxId && <> · TrxID <strong className="font-mono">{order.payment.trxId}</strong></>}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {next && (
        <div className="mt-6 text-center">
          <Link href={`/admin?cursor=${encodeURIComponent(next)}`} className="btn-secondary">Older orders</Link>
        </div>
      )}
    </>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1.5 text-body-sm font-semibold capitalize ${active ? "bg-brand text-fg-inverse" : "bg-surface hover:bg-brand-soft"}`}>
      {label}
    </Link>
  );
}
