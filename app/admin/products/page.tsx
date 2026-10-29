import type { Metadata } from "next";

import { ListFilters } from "@/components/admin/controls";
import { ProductsTable } from "@/components/admin/products-table";
import { LinkButton, PageBody, PageHeader, Pagination, Tabs } from "@/components/admin/ui";
import { loadProducts } from "@/lib/data";
import { SEASON_NAME } from "@/lib/season";
import { lowVariants, totalStock } from "@/lib/stock";
import { SEASONS, type Product } from "@/lib/types";

export const metadata: Metadata = { title: "Products" };

const PAGE = 20;
const TABS = ["all", "active", "hidden", "out", "low"] as const;
const LABEL = { all: "All", active: "Active", hidden: "Hidden", out: "Out of stock", low: "Running low" } as const;

type Query = { tab?: string; q?: string; season?: string; page?: string };

const MATCH: Record<(typeof TABS)[number], (p: Product) => boolean> = {
  all: () => true,
  active: (p) => p.active,
  hidden: (p) => !p.active,
  out: (p) => totalStock(p) === 0 || !p.inStock,
  low: (p) => lowVariants(p).length > 0,
};

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const query = (await searchParams) as Query;
  const tab = TABS.find((t) => t === query.tab) ?? "all";
  const season = SEASONS.find((s) => s === query.season);
  const q = (query.q ?? "").trim().slice(0, 80).toLowerCase();
  const products = await loadProducts();

  const searched = products.filter((p) => (!q || [p.name.en, p.name.bn, p.slug].some((v) => v.toLowerCase().includes(q))) && (!season || p.seasons?.includes(season)));
  const rows = searched.filter(MATCH[tab]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(pages, Math.max(1, Number(query.page) || 1));

  const href = (patch: Partial<Query>) => {
    const next = { tab: tab === "all" ? undefined : tab, q: q || undefined, season, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  };
  const filtered = Boolean(q || season || tab !== "all");

  return (
    <PageBody>
      <PageHeader title="Products" description={`${products.length} in the catalogue`} actions={<LinkButton href="/admin/products/new">+ Add product</LinkButton>} />
      <Tabs label="Product status" items={TABS.map((t) => ({ href: href({ tab: t === "all" ? undefined : t, page: undefined }), label: LABEL[t], count: searched.filter(MATCH[t]).length, active: tab === t }))} />
      <ListFilters
        placeholder="Search by name or URL"
        clearHref={tab === "all" ? "/admin/products" : `/admin/products?tab=${tab}`}
        filters={[{ param: "season", label: "Season", allLabel: "All seasons", options: SEASONS.map((s) => ({ value: s, label: SEASON_NAME[s].en })) }]}
      />
      <ProductsTable products={rows.slice((page - 1) * PAGE, page * PAGE)} reorder={tab === "all" && !q && !season} filtered={filtered} clearHref="/admin/products" />
      {rows.length > 0 && <Pagination page={page} pageSize={PAGE} total={rows.length} href={(n) => href({ page: String(n) })} noun={["product", "products"]} />}
    </PageBody>
  );
}
