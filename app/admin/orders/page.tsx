import type { Metadata } from "next";

import { ListFilters } from "@/components/admin/controls";
import { OrdersTable } from "@/components/admin/orders-table";
import { DownloadButton, LinkButton, PageBody, PageHeader, Pagination, Tabs } from "@/components/admin/ui";
import { loadAllOrders, loadSettings } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/orders";
import { paymentName } from "@/lib/payments";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

const PAGE = 20;
const RANGES: Record<string, number> = { all: 0, "7": 7, "30": 30, "90": 90 };

type Query = { status?: string; q?: string; pay?: string; range?: string; page?: string };

/** Figma-style list recipe, as in Motherhood: status tabs with counts, filters, the table, numbered pages. The URL holds the state. */
export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const query = (await searchParams) as Query;
  const status = ORDER_STATUSES.find((s) => s === query.status);
  const pay = (query.pay ?? "").slice(0, 40) || undefined;
  const range = query.range && query.range in RANGES ? query.range : "all";
  const q = (query.q ?? "").trim().slice(0, 80);

  const [everything, settings] = await Promise.all([loadAllOrders(), loadSettings()]);
  // Every method the store has, plus any an older order used that has since been removed.
  const methodOptions = new Map(settings.payments.methods.map((m) => [m.id, m.name.en]));
  for (const o of everything) if (!methodOptions.has(o.payment.method)) methodOptions.set(o.payment.method, paymentName(o.payment, "en"));
  const cutoff = RANGES[range] ? Date.now() - RANGES[range] * 86_400_000 : 0;
  const needle = q.toLowerCase().replace(/^#/, "");
  const filtered = everything.filter(
    (o) =>
      Date.parse(o.createdAt) >= cutoff &&
      (!pay || o.payment.method === pay) &&
      (!needle || [o.no, o.customer.name, o.customer.phone].some((v) => v.toLowerCase().includes(needle))),
  );
  const rows = status ? filtered.filter((o) => o.status === status) : filtered;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(pages, Math.max(1, Number(query.page) || 1));

  const href = (patch: Partial<Query>) => {
    const next = { status, q: q || undefined, pay, range: range === "all" ? undefined : range, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };
  const count = (s: OrderStatus) => filtered.filter((o) => o.status === s).length;
  const isFiltered = Boolean(q || pay || range !== "all");

  return (
    <PageBody>
      <PageHeader
        title="Orders"
        actions={<><DownloadButton variant="outline" href={`/admin/orders/export${href({ page: undefined }).slice("/admin/orders".length)}`}>Export CSV</DownloadButton><LinkButton href="/admin/orders/new">+ Create order</LinkButton></>}
      />
      <Tabs
        label="Order status"
        items={[
          { href: href({ status: undefined, page: undefined }), label: "All", count: filtered.length, active: !status },
          ...ORDER_STATUSES.map((s) => ({ href: href({ status: s, page: undefined }), label: STATUS_LABEL[s], count: count(s), active: status === s })),
        ]}
      />
      <ListFilters
        placeholder="Search by order number, customer or phone"
        clearHref={status ? `/admin/orders?status=${status}` : "/admin/orders"}
        filters={[
          { param: "pay", label: "Payment", allLabel: "All payments", options: [...methodOptions].map(([value, label]) => ({ value, label })) },
          { param: "range", label: "Date range", fallback: "all", options: [{ value: "all", label: "All time" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }] },
        ]}
      />
      <OrdersTable orders={rows.slice((page - 1) * PAGE, page * PAGE)} filtered={isFiltered || Boolean(status)} clearHref="/admin/orders" />
      {rows.length > 0 && <Pagination page={page} pageSize={PAGE} total={rows.length} href={(n) => href({ page: String(n) })} noun={["order", "orders"]} />}
    </PageBody>
  );
}
