"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { advanceOrder, advanceOrders } from "@/app/admin/actions";
import { taka } from "@/lib/i18n";
import { paymentName } from "@/lib/payments";
import { dhakaTime, itemCount, NEXT_STEP, paymentState, STATUS_LABEL, STATUS_TONE } from "@/lib/orders";
import type { Order } from "@/lib/types";

import { BulkBar, CopyButton, DataTable, Menu, toast, type Column } from "./controls";
import { cn, EmptyState, Icon, OrderPill, StatusPill } from "./ui";

const PAY_TONE = { ok: "text-fg-success", wait: "text-fg-accent", off: "text-fg-tertiary" } as const;

/** The status pill; with a next step it opens a menu holding it, so status changes right in the table. */
function StatusCell({ order, onMove, busy }: { order: Order; onMove: (order: Order) => void; busy: boolean }) {
  const next = NEXT_STEP[order.status];
  if (!next) return <OrderPill status={order.status} className="px-3.5 py-1.5 text-label-md" />;
  return (
    <Menu
      align="start"
      items={[{ label: next.label, disabled: busy, onSelect: () => onMove(order) }]}
      trigger={
        <button type="button" aria-label={`Order #${order.no} is ${STATUS_LABEL[order.status]}. Change status`} className={cn("group/status rounded-full transition-shadow hover:shadow-[0_0_0_2px_var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-brand data-[state=open]:shadow-[0_0_0_2px_var(--color-border-strong)]", busy && "opacity-60")}>
          <StatusPill tone={STATUS_TONE[order.status]} className="px-3.5 py-1.5 pr-2.5 text-label-md">
            {STATUS_LABEL[order.status]}
            <Icon name="chevronDown" className="size-4" />
          </StatusPill>
        </button>
      }
    />
  );
}

/** The orders list: a table from lg up (row click opens the order, ticked rows move together) and cards below. */
export function OrdersTable({ orders, filtered, clearHref }: { orders: Order[]; filtered: boolean; clearHref: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, start] = useTransition();

  const run = (job: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string) =>
    start(async () => {
      const r = await job();
      if (r.ok) {
        setPicked(new Set());
        if (done) toast.success(done);
      } else toast.error(r.error);
      router.refresh();
    });

  const move = (order: Order) => run(() => advanceOrder(order.id, order.status), `#${order.no} is now ${STATUS_LABEL[NEXT_STEP[order.status]!.to].toLowerCase()}`);
  const movable = orders.filter((o) => picked.has(o.id) && NEXT_STEP[o.status]);
  const chosen = orders.filter((o) => picked.has(o.id));

  const columns: Column<Order>[] = [
    {
      key: "order", header: "Order", width: "w-36",
      cell: (o) => (
        <span className="group/copy flex items-center gap-1.5">
          <Link href={`/admin/orders/${o.id}`} className="text-label-md text-fg-brand underline-offset-4 hover:underline">#{o.no}</Link>
          <CopyButton text={o.no} label={`Copy order number ${o.no}`} />
        </span>
      ),
    },
    { key: "date", header: "Date", width: "w-40", cell: (o) => dhakaTime(o.createdAt) },
    { key: "customer", header: "Customer", cell: (o) => <><p className="truncate text-label-md text-fg-primary">{o.customer.name}</p><p className="truncate text-caption text-fg-secondary">{o.zone.name}</p></> },
    { key: "items", header: "Items", width: "w-18", cell: (o) => itemCount(o) },
    { key: "total", header: "Total", width: "w-28", cell: (o) => taka(o.total, "en") },
    { key: "payment", header: "Payment", width: "w-36", cell: (o) => { const pay = paymentState(o); return <><p>{paymentName(o.payment, "en")}</p><p className={cn("text-caption", PAY_TONE[pay.tone])}>{pay.label}</p></>; } },
    { key: "status", header: "Status", width: "w-44", cell: (o) => <StatusCell order={o} onMove={move} busy={busy} /> },
  ];

  const empty = (
    <EmptyState title={filtered ? "No orders match these filters" : "No orders yet"}>
      {filtered ? <Link href={clearHref} className="text-fg-brand underline-offset-4 hover:underline">Clear filters</Link> : <>They show up here the moment someone checks out, or <Link href="/admin/orders/new" className="text-fg-brand underline-offset-4 hover:underline">create one yourself</Link>.</>}
    </EmptyState>
  );

  return (
    <>
      <div className="max-lg:hidden">
        <DataTable
          label="Orders"
          columns={columns}
          rows={orders}
          rowKey={(o) => o.id}
          minWidth="min-w-250"
          busy={busy}
          onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
          empty={empty}
          selection={{
            selected: picked,
            onChange: (id, on) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; }),
            onChangeAll: (on) => setPicked(on ? new Set(orders.map((o) => o.id)) : new Set()),
            allLabel: "Select every order on this page",
            rowLabel: (id) => `Select order #${orders.find((o) => o.id === id)?.no ?? id}`,
          }}
        />
      </div>

      <ul className="flex flex-col gap-3 lg:hidden">
        {orders.length === 0 && <li className="rounded-lg border border-border bg-surface px-6 py-10">{empty}</li>}
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-brand">
              <span className="flex items-center justify-between gap-3"><span className="text-label-md text-fg-brand">#{o.no}</span><OrderPill status={o.status} /></span>
              <span className="flex items-end justify-between gap-3">
                <span className="min-w-0"><span className="block truncate text-label-md text-fg-primary">{o.customer.name}</span><span className="block truncate text-caption text-fg-secondary">{o.zone.name} · {dhakaTime(o.createdAt)}</span></span>
                <span className="shrink-0 text-label-md text-fg-primary">{taka(o.total, "en")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <BulkBar
        count={picked.size}
        busy={busy}
        onClear={() => setPicked(new Set())}
        actions={[
          { label: movable.length ? `Move ${movable.length} one step on` : "Nothing to move on", disabled: movable.length === 0, onSelect: () => run(() => advanceOrders(movable.map((o) => o.id)), `${movable.length} ${movable.length === 1 ? "order" : "orders"} moved on`) },
          { label: `Export ${picked.size}`, onSelect: () => { window.location.href = `/admin/orders/export?nos=${chosen.map((o) => o.no).join(",")}`; } },
        ]}
      />
    </>
  );
}
