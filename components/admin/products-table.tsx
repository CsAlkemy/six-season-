"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteProduct, moveProduct, setProductsActive } from "@/app/admin/actions";
import { ProductMedia } from "@/components/product-media";
import { taka } from "@/lib/i18n";
import { SEASON_NAME } from "@/lib/season";
import { DEFAULT_LOW_STOCK, lowVariants, totalStock } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { variantsOf } from "@/lib/variants";

import { BulkBar, DataTable, Menu, Modal, RowMenu, toast, type Column } from "./controls";
import { Button, cn, EmptyState, Icon, StatusPill } from "./ui";

/** The stock number over a 6px bar: green, amber or red by how close it is to the alert level. */
function StockBar({ product }: { product: Product }) {
  const total = totalStock(product);
  if (total === null) return <span className={product.inStock ? "" : "text-fg-error"}>{product.inStock ? "In stock" : "Out of stock"}</span>;
  const level = product.lowStockAt ?? DEFAULT_LOW_STOCK;
  const tone = total === 0 || lowVariants(product).some((v) => v.stock === 0) ? "low" : lowVariants(product).length ? "fair" : "good";
  return (
    <div className="flex w-25 flex-col gap-1">
      <span className={cn("text-label-md", tone === "low" ? "text-fg-error" : "text-fg-primary")}>{total === 0 ? "Sold out" : total}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <div className={cn("h-full rounded-full", { good: "bg-success", fair: "bg-accent", low: "bg-fg-error" }[tone])} style={{ width: total > 0 ? `${Math.min(100, (total / (level * 6)) * 100)}%` : "6px" }} />
      </div>
    </div>
  );
}

/** The products list: photo, price, stock, a status pill that turns the product on or off, and a ⋯ menu. */
export function ProductsTable({ products, reorder, filtered, clearHref }: { products: Product[]; reorder: boolean; filtered: boolean; clearHref: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<Product | null>(null);
  const [busy, start] = useTransition();

  const run = (job: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string) =>
    start(async () => {
      const r = await job();
      if (r.ok) {
        setPicked(new Set());
        setRemoving(null);
        if (done) toast.success(done);
      } else toast.error(r.error);
      router.refresh();
    });

  const columns: Column<Product>[] = [
    {
      key: "product", header: "Product",
      cell: (p) => (
        <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-fg-brand">
          <ProductMedia product={p} lang="en" className="size-11! shrink-0 rounded-md [&_span]:hidden [&_svg]:size-5" />
          <span className="min-w-0"><span className="block truncate text-label-md">{p.name.en}</span><span className="block truncate text-caption text-fg-secondary">{p.name.bn} · {variantsOf(p).length} {variantsOf(p).length === 1 ? "size" : "sizes"}</span></span>
        </Link>
      ),
    },
    { key: "price", header: "Price", width: "w-36", cell: (p) => { const prices = variantsOf(p).map((v) => v.price); const [lo, hi] = [Math.min(...prices), Math.max(...prices)]; return lo === hi ? taka(lo, "en") : `${taka(lo, "en")} – ${taka(hi, "en")}`; } },
    { key: "stock", header: "Stock", width: "w-32", cell: (p) => <StockBar product={p} /> },
    { key: "seasons", header: "In season", width: "w-40", cell: (p) => <span className="text-fg-secondary">{p.seasons?.length ? p.seasons.map((s) => SEASON_NAME[s].en).join(", ") : "—"}</span> },
    {
      key: "status", header: "Status", width: "w-36",
      cell: (p) => (
        <Menu
          align="start"
          items={[{ label: p.active ? "Turn off" : "Turn on", disabled: busy, onSelect: () => run(() => setProductsActive([p.id], !p.active), `${p.name.en} is ${p.active ? "hidden" : "on the store"}`) }]}
          trigger={
            <button type="button" aria-label={`${p.name.en} is ${p.active ? "on the store" : "hidden"}. Change status`} className="group/status rounded-full transition-shadow hover:shadow-[0_0_0_2px_var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-brand data-[state=open]:shadow-[0_0_0_2px_var(--color-border-strong)]">
              <StatusPill tone={p.active ? "success" : "neutral"} className="px-3.5 py-1.5 pr-2.5 text-label-md">{p.active ? "Active" : "Hidden"}<Icon name="chevronDown" className="size-4" /></StatusPill>
            </button>
          }
        />
      ),
    },
    {
      key: "menu", header: <span className="sr-only">Actions</span>, width: "w-16",
      cell: (p) => {
        const i = products.findIndex((x) => x.id === p.id);
        return (
          <RowMenu
            label={`More for ${p.name.en}`}
            items={[
              { label: "Edit", onSelect: () => router.push(`/admin/products/${p.id}`) },
              ...(reorder ? [{ label: "Move up", disabled: i === 0, onSelect: () => run(() => moveProduct(p.id, "up")) }, { label: "Move down", disabled: i === products.length - 1, onSelect: () => run(() => moveProduct(p.id, "down")) }] : []),
              { separator: true as const },
              { label: "Delete", destructive: true, onSelect: () => setRemoving(p) },
            ]}
          />
        );
      },
    },
  ];

  const empty = (
    <EmptyState title={filtered ? "No products match" : "No products yet"}>
      {filtered ? <Link href={clearHref} className="text-fg-brand underline-offset-4 hover:underline">Clear filters</Link> : "Add the first one to start selling."}
    </EmptyState>
  );
  const ids = [...picked];

  return (
    <>
      <div className="max-lg:hidden">
        <DataTable
          label="Products"
          columns={columns}
          rows={products}
          rowKey={(p) => p.id}
          minWidth="min-w-200"
          busy={busy}
          onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
          rowClassName={(p) => (p.active ? undefined : "text-fg-tertiary")}
          empty={empty}
          selection={{
            selected: picked,
            onChange: (id, on) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; }),
            onChangeAll: (on) => setPicked(on ? new Set(products.map((p) => p.id)) : new Set()),
            allLabel: "Select every product on this page",
            rowLabel: (id) => `Select ${products.find((p) => p.id === id)?.name.en ?? id}`,
          }}
        />
      </div>

      <ul className="flex flex-col gap-3 lg:hidden">
        {products.length === 0 && <li className="rounded-lg border border-border bg-surface px-6 py-10">{empty}</li>}
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 focus-visible:outline-2 focus-visible:outline-brand">
              <ProductMedia product={p} lang="en" className="size-14! shrink-0 rounded-md [&_span]:hidden [&_svg]:size-5" />
              <span className="min-w-0 flex-1"><span className="block truncate text-label-md">{p.name.en}</span><span className="block text-caption text-fg-secondary">{taka(p.price, "en")} · {totalStock(p) ?? (p.inStock ? "In stock" : "Out of stock")}{totalStock(p) !== null ? " in stock" : ""}</span></span>
              <StatusPill tone={p.active ? "success" : "neutral"}>{p.active ? "Active" : "Hidden"}</StatusPill>
            </Link>
          </li>
        ))}
      </ul>

      <BulkBar
        count={picked.size}
        busy={busy}
        onClear={() => setPicked(new Set())}
        actions={[
          { label: "Turn on", onSelect: () => run(() => setProductsActive(ids, true), `${ids.length} on the store`) },
          { label: "Turn off", onSelect: () => run(() => setProductsActive(ids, false), `${ids.length} hidden`) },
        ]}
      />

      <Modal
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Delete ${removing?.name.en ?? "product"}?`}
        description="It leaves the store and its photos are removed. This can't be undone."
        footer={<><Button variant="outline" onClick={() => setRemoving(null)}>Keep it</Button><Button loading={busy} onClick={() => removing && run(() => deleteProduct(removing.id), `${removing.name.en} deleted`)}>Delete product</Button></>}
      />
    </>
  );
}
