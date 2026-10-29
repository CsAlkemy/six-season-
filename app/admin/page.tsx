import type { Metadata } from "next";
import Link from "next/link";

import { cn, ContentCard, DownloadButton, KpiCard, LinkButton, OrderPill, PageBody, PageHeader, StatusPill, Table, Td, Th, TableMessage } from "@/components/admin/ui";
import { hasBlob } from "@/lib/blob";
import { loadAllOrders, loadProducts } from "@/lib/data";
import { taka } from "@/lib/i18n";
import { dhakaTime } from "@/lib/orders";
import { DEFAULT_LOW_STOCK, lowVariants } from "@/lib/stock";

export const metadata: Metadata = { title: "Dashboard" };

const DAY = 86_400_000;
const dayKey = (t: number | string) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

/** The change against the 30 days before, as a KpiCard's arrow and percentage. */
function change(now: number, before: number) {
  if (!before) return {};
  const pct = ((now - before) / before) * 100;
  return { delta: `${Math.abs(pct).toFixed(1)}%`, trend: pct < 0 ? ("down" as const) : ("up" as const) };
}

/** Three gridlines on round taka. */
function axisTop(max: number) {
  if (max <= 0) return 3;
  const rough = max / 3;
  const mag = 10 ** Math.floor(Math.log10(rough));
  return ([1, 2, 2.5, 5, 10].find((f) => f * mag >= rough) ?? 10) * mag * 3;
}

export default async function Dashboard() {
  const [orders, products] = await Promise.all([loadAllOrders(), loadProducts()]);
  const now = Date.now();
  const sold = orders.filter((o) => o.status !== "cancelled");
  const within = (from: number, to: number) => sold.filter((o) => now - Date.parse(o.createdAt) >= from * DAY && now - Date.parse(o.createdAt) < to * DAY);
  const [month, before] = [within(0, 30), within(30, 60)];
  const revenue = (list: typeof sold) => list.reduce((sum, o) => sum + o.total, 0);

  const days = Array.from({ length: 30 }, (_, i) => ({ t: now - (29 - i) * DAY, total: 0 }));
  for (const o of month) {
    const day = days.find((d) => dayKey(d.t) === dayKey(o.createdAt));
    if (day) day.total += o.total;
  }
  const top = axisTop(Math.max(...days.map((d) => d.total)));
  const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });

  const waiting = orders.filter((o) => o.status === "new").length;
  const low = products.filter((p) => p.active).flatMap((p) => lowVariants(p).map((v) => ({ p, v })));
  const worst = [...low].sort((a, b) => (a.v.stock ?? 0) - (b.v.stock ?? 0)).slice(0, 6);
  const recent = orders.slice(0, 6);

  return (
    <PageBody>
      <PageHeader
        title="Dashboard"
        description="How the shop is doing, and what needs you today."
        actions={<><DownloadButton variant="outline" href="/admin/orders/export">Export orders</DownloadButton><LinkButton href="/admin/products/new">+ Add product</LinkButton></>}
      />
      {!hasBlob() && <p className="rounded-lg border border-border bg-surface p-4 text-body-sm text-fg-secondary">Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to receive orders and save changes.</p>}

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard label="Sales (30 days)" value={taka(revenue(month), "en")} note="vs previous 30 days" {...change(revenue(month), revenue(before))} />
        <KpiCard label="Orders" value={month.length.toLocaleString("en-IN")} note="vs previous 30 days" {...change(month.length, before.length)} />
        <KpiCard label="Waiting for you" value={waiting.toLocaleString("en-IN")} note={waiting ? "New orders to confirm" : "All caught up"} valueClassName={waiting ? "text-fg-error" : undefined} />
        <KpiCard label="Running low" value={low.length.toLocaleString("en-IN")} note={low.length ? "Sizes under their alert level" : "Stock looks fine"} valueClassName={low.length ? "text-fg-error" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ContentCard title="Sales" subtitle="Per day, last 30 days" padding="md" className="min-w-0">
          <div className="relative h-57.5">
            <div aria-hidden className="absolute inset-x-0 top-0 h-45">
              {[0, 1, 2, 3].map((i) => <span key={i} className="absolute inset-x-0 h-px bg-border" style={{ top: `${(i / 3) * 100}%` }} />)}
            </div>
            <ol aria-label="Sales by day" className="relative flex">
              {days.map((d, i) => (
                <li key={d.t} tabIndex={0} className="group relative flex min-w-0 flex-1 flex-col items-center rounded-sm px-px sm:px-0.5 focus-visible:outline-2 focus-visible:outline-brand">
                  <span className="sr-only">{fmtDay(d.t)}: {taka(d.total, "en")}</span>
                  <div aria-hidden className="flex h-45 w-full items-end justify-center">
                    <span className="w-full max-w-4.5 rounded-t-xs bg-brand transition-[filter] group-hover:brightness-110" style={{ height: `${(d.total / top) * 100}%`, minHeight: d.total ? 3 : 0 }} />
                  </div>
                  <span aria-hidden className={cn("mt-3 text-[11px] font-medium text-fg-tertiary", i % 2 === 1 && "max-sm:invisible", i % 3 !== 0 && "max-lg:invisible")}>{new Date(d.t).toLocaleDateString("en", { timeZone: "Asia/Dhaka", day: "numeric" })}</span>
                  <div aria-hidden className={cn("pointer-events-none invisible absolute top-0 z-10 flex w-max flex-col gap-1 rounded-md border border-border bg-surface px-3 py-2 shadow-hover group-hover:visible group-focus-visible:visible", i < 2 ? "left-0" : i >= 28 ? "right-0" : "left-1/2 -translate-x-1/2")}>
                    <span className="text-caption text-fg-tertiary">{fmtDay(d.t)}</span>
                    <span className="text-label-md text-fg-primary">{taka(d.total, "en")}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </ContentCard>

        <ContentCard title="Low stock" subtitle="Under the alert level" padding="md" className="min-w-0" action={low.length ? <StatusPill tone="failed">{low.length} {low.length === 1 ? "item" : "items"}</StatusPill> : null}>
          {worst.length ? (
            <ul className="flex flex-col gap-4">
              {worst.map(({ p, v }) => {
                const level = p.lowStockAt ?? DEFAULT_LOW_STOCK;
                const share = Math.min((v.stock ?? 0) / Math.max(level, 1), 1);
                return (
                  <li key={`${p.id}:${v.id}`} className="flex flex-col gap-1.5">
                    <p className="flex items-start justify-between gap-3 text-label-md">
                      <Link href={`/admin/products/${p.id}`} className="text-fg-primary hover:text-fg-brand">{p.name.en} <span className="font-normal text-fg-tertiary">· {v.label.en}</span></Link>
                      <span className="shrink-0 text-fg-error">{v.stock ? `${v.stock} left` : "Sold out"}</span>
                    </p>
                    <span aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-muted"><span className={share < 0.25 ? "bg-fg-error" : "bg-accent"} style={{ width: `${share * 100}%`, minWidth: v.stock ? undefined : 6 }} /></span>
                    <p className="text-caption text-fg-tertiary">Alert at {level}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body-sm text-fg-secondary">Everything is above its alert level.</p>
          )}
          {low.length > 0 && <LinkButton variant="secondary" href="/admin/products?tab=low" className="mt-auto w-full">See all running low</LinkButton>}
        </ContentCard>
      </div>

      <ContentCard title="Recent orders" flush className="min-w-0 pb-2" action={<Link href="/admin/orders" className="pr-6 text-label-md text-fg-brand underline-offset-4 hover:underline">View all</Link>}>
        <div className="border-y border-border md:border-0">
          <Table minWidth="min-w-140" fixed={false} bare head={<><Th className="w-36">Order</Th><Th>Customer</Th><Th className="w-40">Date</Th><Th className="w-28">Total</Th><Th className="w-36">Status</Th></>}>
            {recent.length === 0 ? (
              <TableMessage colSpan={5}><p className="text-body-sm text-fg-secondary">No orders yet. They show up here the moment someone checks out.</p></TableMessage>
            ) : recent.map((o) => (
              <tr key={o.id} className="border-b border-border transition-colors last:border-b last:border-border hover:bg-page">
                <Td><Link href={`/admin/orders/${o.id}`} className="text-label-md text-fg-brand underline-offset-4 hover:underline">#{o.no}</Link></Td>
                <Td className="truncate">{o.customer.name}</Td>
                <Td className="text-fg-secondary">{dhakaTime(o.createdAt)}</Td>
                <Td>{taka(o.total, "en")}</Td>
                <Td><OrderPill status={o.status} /></Td>
              </tr>
            ))}
          </Table>
        </div>
      </ContentCard>
    </PageBody>
  );
}
