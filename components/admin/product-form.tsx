"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { deleteProduct, saveProduct, type ProductDraft } from "@/app/admin/actions";
import { SEASON_NAME } from "@/lib/season";
import { DEFAULT_LOW_STOCK } from "@/lib/stock";
import { MAX_PHOTOS, SEASONS, type Product, type Text } from "@/lib/types";
import { variantsOf } from "@/lib/variants";

import { Modal, SwitchRow, toast } from "./controls";
import { uploadPhoto } from "./image-upload";
import { Button, Callout, ContentCard, FormField, Icon, PageBody, PageHeader, Spinner, StatusPill, Table, Td, Th } from "./ui";

type Size = ProductDraft["variants"][number];
const blank = (): Size => ({ id: "", label: { bn: "", en: "" }, price: 0, compareAt: null, stock: 0 });

function draftOf(product: Product | null): ProductDraft {
  if (!product) return { id: "", slug: "", name: { bn: "", en: "" }, description: { bn: "", en: "" }, images: [], tone: "soil", seasons: [], active: false, lowStockAt: DEFAULT_LOW_STOCK, variants: [blank()] };
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    images: product.images?.length ? product.images : product.image ? [product.image] : [],
    tone: product.tone,
    seasons: product.seasons ?? [],
    active: product.active,
    lowStockAt: product.lowStockAt ?? DEFAULT_LOW_STOCK,
    // Sizes saved before stock counts start at 10 when they were in stock, for the admin to correct.
    variants: variantsOf(product).map((v) => ({ id: v.id, label: v.label, price: v.price, compareAt: v.compareAt, stock: v.stock ?? (v.inStock ? 10 : 0) })),
  };
}

/** A compact input for a table cell. */
const cellField = "h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-body-sm text-fg-primary outline-none transition-colors placeholder:text-fg-tertiary focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand-soft aria-invalid:border-fg-error";

/** Motherhood's two columns: basic information, photos and sizes on the left; status, season, inventory and search beside them. */
export function ProductForm({ product }: { product: Product | null }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => draftOf(product));
  const [draft, setDraft] = useState(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setSize = (i: number, patch: Partial<Size>) => set({ variants: draft.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const setText = (key: "name" | "description", lang: keyof Text, value: string) => set({ [key]: { ...draft[key], [lang]: value } });

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const room = MAX_PHOTOS - draft.images.length - uploading;
  const addPhotos = async (files: File[]) => {
    const picked = files.slice(0, Math.max(room, 0));
    if (files.length > picked.length) toast.info(`Only ${MAX_PHOTOS} photos fit; the rest were skipped`);
    setUploading(picked.length);
    const results = await Promise.all(picked.map((file) => uploadPhoto(file, "products")));
    setUploading(0);
    const urls = results.flatMap((r) => ("url" in r ? [r.url] : []));
    results.forEach((r) => "error" in r && toast.error(r.error));
    if (urls.length) setDraft((d) => ({ ...d, images: [...d.images, ...urls].slice(0, MAX_PHOTOS) }));
  };

  const onSave = () =>
    start(async () => {
      const r = await saveProduct(draft);
      if (!r.ok) return toast.error(r.error);
      toast.success(product ? "Saved. The store updates within a minute." : "Product added");
      if (!product) return router.replace(`/admin/products/${r.id}`);
      setSaved(draft);
      router.refresh();
    });

  const onDelete = () =>
    start(async () => {
      const r = await deleteProduct(draft.id);
      if (r.ok) {
        toast.success(`${draft.name.en} deleted`);
        router.replace("/admin/products");
      } else toast.error(r.error);
    });

  const slug = draft.slug || draft.name.en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ label: "Products", href: "/admin/products" }, { label: product ? product.name.en : "New product" }]}
        title={product ? product.name.en : "New product"}
        actions={
          <>
            <Button variant="outline" disabled={!dirty || pending} onClick={() => setDraft(saved)}>Discard</Button>
            <Button loading={pending} disabled={uploading > 0 || (!dirty && Boolean(product))} onClick={onSave}>{product ? "Save changes" : "Save product"}</Button>
          </>
        }
      />
      {dirty && product && <Callout>You have unsaved changes.</Callout>}

      <div className="flex items-start gap-4 max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-4 max-lg:w-full">
          <ContentCard title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name · বাংলা" htmlFor="name-bn"><input id="name-bn" value={draft.name.bn} onChange={(e) => setText("name", "bn", e.target.value)} className="field" /></FormField>
              <FormField label="Name · English" htmlFor="name-en"><input id="name-en" value={draft.name.en} onChange={(e) => setText("name", "en", e.target.value)} className="field" /></FormField>
              <FormField label="Description · বাংলা" htmlFor="desc-bn"><textarea id="desc-bn" rows={5} value={draft.description.bn} onChange={(e) => setText("description", "bn", e.target.value)} className="field" /></FormField>
              <FormField label="Description · English" htmlFor="desc-en"><textarea id="desc-en" rows={5} value={draft.description.en} onChange={(e) => setText("description", "en", e.target.value)} className="field" /></FormField>
            </div>
          </ContentCard>

          <ContentCard title="Photos" action={<span className="text-caption text-fg-secondary">First photo becomes the cover</span>}>
            <div className="flex flex-wrap gap-3">
              {draft.images.map((url, i) => (
                <div key={url} className="group relative size-28 overflow-hidden rounded-md border border-border">
                  <img src={url} alt={`Product photo ${i + 1}`} className="size-full object-cover" />
                  {i === 0 && <StatusPill tone="info" className="absolute top-1.5 left-1.5 px-2 py-0.5">Cover</StatusPill>}
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => set({ images: draft.images.filter((_, j) => j !== i) })} className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full border border-border-strong bg-surface hover:bg-muted"><Icon name="x" className="size-3.5" /></button>
                  {i > 0 && <button type="button" onClick={() => set({ images: [url, ...draft.images.filter((u) => u !== url)] })} className="absolute inset-x-1.5 bottom-1.5 rounded-full border border-border-strong bg-surface py-1 text-caption text-fg-primary hover:bg-muted">Make cover</button>}
                </div>
              ))}
              {Array.from({ length: uploading }, (_, i) => <div key={i} className="grid size-28 place-items-center rounded-md bg-muted"><Spinner className="size-5 text-fg-tertiary" /></div>)}
              {room > 0 && (
                <button type="button" onClick={() => fileInput.current?.click()} className="flex size-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-brand bg-brand-subtle text-caption text-fg-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand"><Icon name="plus" />Add photo</button>
              )}
            </div>
            <input ref={fileInput} type="file" multiple hidden accept="image/*" onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ""; if (files.length) void addPhotos(files); }} />
            <p className="text-caption text-fg-tertiary">Up to {MAX_PHOTOS} photos, shrunk to WebP before they upload.</p>
          </ContentCard>

          <ContentCard title="Sizes & stock" flush action={<span className="pr-6"><Button variant="secondary" disabled={draft.variants.length >= 12} onClick={() => set({ variants: [...draft.variants, blank()] })}>+ Add size</Button></span>}>
            <Table bare minWidth="min-w-180" widths={["", "", "w-28", "w-28", "w-24", "w-24"]} head={<><Th>Size · বাংলা</Th><Th>Size · English</Th><Th>Price (৳)</Th><Th>Was (৳)</Th><Th>Stock</Th><Th><span className="sr-only">Remove</span></Th></>}>
              {draft.variants.map((v, i) => (
                <tr key={i} className="border-y border-border last:border-b-0">
                  <Td><input aria-label="Size in Bangla" className={cellField} value={v.label.bn} placeholder="৫০০ গ্রাম" onChange={(e) => setSize(i, { label: { ...v.label, bn: e.target.value } })} /></Td>
                  <Td><input aria-label="Size in English" className={cellField} value={v.label.en} placeholder="500 g" onChange={(e) => setSize(i, { label: { ...v.label, en: e.target.value } })} /></Td>
                  <Td><input aria-label="Price" type="number" min={0} className={cellField} value={v.price || ""} onChange={(e) => setSize(i, { price: Number(e.target.value) })} /></Td>
                  <Td><input aria-label="Was price" type="number" min={0} className={cellField} value={v.compareAt ?? ""} onChange={(e) => setSize(i, { compareAt: e.target.value ? Number(e.target.value) : null })} /></Td>
                  <Td><input aria-label="Stock" type="number" min={0} className={cellField} value={v.stock} onChange={(e) => setSize(i, { stock: Number(e.target.value) })} /></Td>
                  <Td><button type="button" disabled={draft.variants.length === 1} onClick={() => set({ variants: draft.variants.filter((_, j) => j !== i) })} className="text-label-md text-fg-error underline-offset-4 hover:underline disabled:opacity-30 disabled:hover:no-underline">Remove</button></Td>
                </tr>
              ))}
            </Table>
            <p className="px-6 pt-3 text-caption text-fg-tertiary">Orders take units off and cancelling puts them back. A size at 0 shows as sold out.</p>
          </ContentCard>
        </div>

        <div className="flex w-85 shrink-0 flex-col gap-4 max-lg:w-full">
          <ContentCard title="Status">
            <SwitchRow label="Active" description={draft.active ? "Visible in the store" : "Saved as draft until you turn this on"} checked={draft.active} onCheckedChange={(active) => set({ active })} />
          </ContentCard>

          <ContentCard title="In season">
            <p className="text-caption text-fg-secondary">Listed first and badged on the store in these seasons.</p>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => {
                const on = draft.seasons.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => set({ seasons: on ? draft.seasons.filter((x) => x !== s) : [...draft.seasons, s] })} className={`rounded-full border px-3.5 py-1.5 text-label-md transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on ? "border-border-brand bg-brand-soft text-fg-brand" : "border-border-strong text-fg-secondary hover:bg-muted"}`}>{SEASON_NAME[s].en}</button>
                );
              })}
            </div>
          </ContentCard>

          <ContentCard title="Inventory">
            <FormField label="Low-stock alert at" htmlFor="low" hint="A size at or under this shows as running low."><input id="low" type="number" min={0} value={draft.lowStockAt} onChange={(e) => set({ lowStockAt: Number(e.target.value) })} className="field" /></FormField>
            <FormField label="Placeholder colour" htmlFor="tone" hint="Shown on the store while a product has no photo.">
              <select id="tone" value={draft.tone} onChange={(e) => set({ tone: e.target.value as ProductDraft["tone"] })} className="field">
                {["butter", "mustard", "soil", "leaf"].map((t) => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}
              </select>
            </FormField>
          </ContentCard>

          <ContentCard title="Search listing">
            <FormField label="URL" htmlFor="slug"><input id="slug" value={draft.slug} placeholder={slug || "gawa-ghee"} onChange={(e) => set({ slug: e.target.value })} className="field" /></FormField>
            <div className="flex flex-col gap-0.5 rounded-md bg-muted p-3">
              <p className="truncate text-caption text-fg-success">matirtaan.com/p/{slug || "…"}</p>
              <p className="truncate text-label-md text-fg-brand">{draft.name.en || "Product name"}</p>
              <p className="line-clamp-2 text-caption text-fg-secondary">{draft.description.en || "The description shows here in search results."}</p>
            </div>
          </ContentCard>

          {product && <Button variant="outline" className="w-full text-fg-error hover:bg-error-soft" onClick={() => setConfirmDelete(true)}>Delete product</Button>}
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${product?.name.en ?? "product"}?`}
        description="It leaves the store and its photos are removed. This can't be undone."
        footer={<><Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button><Button loading={pending} onClick={onDelete}>Delete product</Button></>}
      />
    </PageBody>
  );
}
