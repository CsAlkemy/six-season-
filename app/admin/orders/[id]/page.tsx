import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderActionsCard, OrderHeaderActions, OrderNoteCard, PackingSlip } from "@/components/admin/order-actions";
import { Avatar, ContentCard, Icon, Labelled, LinkButton, OrderPill, PageBody, PageHeader, StatusPill } from "@/components/admin/ui";
import { listCustomerOrders } from "@/lib/customers";
import { loadOrder } from "@/lib/data";
import { PAYMENT_LABEL, taka } from "@/lib/i18n";
import { dhakaTime, historyOf, paymentState, STATUS_LABEL } from "@/lib/orders";
import { ORDER_STATUSES } from "@/lib/types";

const FLOW = ORDER_STATUSES.filter((s) => s !== "cancelled");
const PAY_PILL = { ok: "success", wait: "pending", off: "neutral" } as const;

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  const order = await loadOrder((await params).id);
  return { title: order ? `Order #${order.no}` : "Order not found" };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-body-sm">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="text-right font-semibold text-fg-primary">{children}</dd>
    </div>
  );
}

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await loadOrder(id);
  if (!order) {
    return (
      <PageBody>
        <PageHeader crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: "Not found" }]} title="Order not found" description="There's no order with that link." actions={<LinkButton variant="outline" href="/admin/orders">Back to orders</LinkButton>} />
      </PageBody>
    );
  }
  const history = historyOf(order);
  const pay = paymentState(order);
  const orderCount = (await listCustomerOrders(order.customer.phone).catch(() => [])).length;
  const cancelled = order.status === "cancelled";
  const cancelEvent = history.findLast((h) => h.status === "cancelled");
  const reached = new Set(history.map((h) => h.status));
  const steps = (cancelled ? history.filter((h) => h.status !== "cancelled") : FLOW.map((s) => history.find((h) => h.status === s) ?? { status: s, at: "" }));

  return (
    <>
      <PageBody>
        <PageHeader
          crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: `#${order.no}` }]}
          title={`Order #${order.no}`}
          description={[`Placed ${dhakaTime(order.createdAt)}`, order.lang === "bn" ? "Bangla store" : "English store", PAY_NOTE(order)].join(" · ")}
          actions={<OrderHeaderActions order={order} />}
        />

        <div className="flex items-start gap-4 max-lg:flex-col">
          <div className="flex min-w-0 flex-1 flex-col gap-4 max-lg:w-full">
            <ContentCard title="Items" flush className="pb-2" action={<span className="pr-6"><OrderPill status={order.status} /></span>}>
              <ul className="border-t border-border">
                {order.items.map((item, i) => (
                  <li key={`${item.productId}:${item.variantId ?? i}`} className="flex items-center justify-between gap-4 border-b border-border px-6 py-3 last:border-b-0">
                    <span className="min-w-0"><span className="block truncate text-label-md text-fg-primary">{item.name}</span><span className="block text-caption text-fg-secondary">{item.unit} · {taka(item.price, "en")} × {item.qty}</span></span>
                    <span className="shrink-0 text-label-md text-fg-primary">{taka(item.price * item.qty, "en")}</span>
                  </li>
                ))}
              </ul>
              <dl className="flex flex-col gap-2 border-t border-border px-6 pt-4 pb-2">
                <Row label="Subtotal">{taka(order.subtotal, "en")}</Row>
                <Row label={`Delivery · ${order.zone.name}`}>{order.deliveryFee ? taka(order.deliveryFee, "en") : "Free"}</Row>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-3 text-h4"><dt>Total</dt><dd>{taka(order.total, "en")}</dd></div>
              </dl>
            </ContentCard>

            <ContentCard title="Order timeline">
              <ol className="flex flex-col gap-4">
                {steps.map((step) => {
                  const done = reached.has(step.status);
                  return (
                    <li key={step.status} className="flex items-center gap-3">
                      <span className={done ? "grid size-6 shrink-0 place-items-center rounded-full bg-success text-fg-inverse" : "size-6 shrink-0 rounded-full bg-muted"}>{done && <Icon name="check" className="size-3.5" strokeWidth={3} />}</span>
                      <div className="flex min-w-0 flex-col">
                        <p className={done ? "text-label-md text-fg-primary" : "text-label-md text-fg-tertiary"}>{step.status === "new" ? "Order placed" : STATUS_LABEL[step.status]}<span className="sr-only">{done ? ", done" : ", not yet"}</span></p>
                        <p className="text-caption text-fg-secondary">{done ? (step.at ? dhakaTime(step.at) : "Time not recorded") : "Pending"}</p>
                      </div>
                    </li>
                  );
                })}
                {cancelled && (
                  <li className="flex items-center gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-error-soft text-fg-error"><Icon name="x" className="size-3.5" strokeWidth={3} /></span>
                    <div className="flex min-w-0 flex-col">
                      <p className="text-label-md text-fg-error">Cancelled</p>
                      <p className="text-caption text-fg-secondary">{dhakaTime(cancelEvent?.at || order.createdAt)}{cancelEvent?.note ? ` · “${cancelEvent.note}”` : ""}</p>
                    </div>
                  </li>
                )}
              </ol>
            </ContentCard>
          </div>

          <div className="flex w-90 shrink-0 flex-col gap-4 max-lg:w-full">
            <ContentCard title="Customer">
              <div className="flex items-center gap-3">
                <Avatar name={order.customer.name} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-label-md text-fg-primary">{order.customer.name}</p>
                  <p className="text-caption text-fg-secondary">{orderCount > 1 ? `${orderCount} orders` : "First order"}</p>
                </div>
              </div>
              <a href={`tel:${order.customer.phone}`} className="text-body-sm text-fg-secondary hover:text-fg-primary">{order.customer.phone}</a>
            </ContentCard>

            <ContentCard title="Delivery address">
              <p className="text-body-sm whitespace-pre-line text-fg-secondary">{order.customer.address}</p>
              <Labelled label="Area">{order.zone.name}</Labelled>
              {order.customer.note && <Labelled label="Customer note"><p className="text-body-sm font-normal text-fg-secondary">{order.customer.note}</p></Labelled>}
            </ContentCard>

            <ContentCard title="Payment">
              <dl className="flex flex-col gap-4">
                <Row label="Method">{PAYMENT_LABEL[order.payment.method].en}</Row>
                <Row label="Transaction">{order.payment.trxId ? <span className="font-mono">{order.payment.trxId}</span> : "—"}</Row>
                <Row label="Status"><StatusPill tone={PAY_PILL[pay.tone]}>{pay.label}</StatusPill></Row>
              </dl>
            </ContentCard>

            <OrderNoteCard id={order.id} note={order.adminNote ?? ""} />
            <OrderActionsCard order={order} />
            <Link href="/admin/orders" className="self-center text-label-md text-fg-secondary underline-offset-4 hover:text-fg-primary hover:underline">← All orders</Link>
          </div>
        </div>
      </PageBody>
      <PackingSlip order={order} />
    </>
  );
}

/** "Cash on delivery" or "bKash · TrxID …", for the line under the title. */
function PAY_NOTE(order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>) {
  return order.payment.method === "cod" ? "Cash on delivery" : `${PAYMENT_LABEL[order.payment.method].en}${order.payment.trxId ? ` · ${order.payment.trxId}` : ""}`;
}
