"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

import { createAdminOrder, lookupCustomer } from "@/app/admin/actions";
import { taka } from "@/lib/i18n";
import { isCash } from "@/lib/payments";
import { deliveryFee, methodAvailable, normalizePhone } from "@/lib/pricing";
import type { DeliveryZone, PaymentMethod } from "@/lib/types";

import { Modal, SearchField, SwitchRow, toast } from "./controls";
import { Input } from "./fields";
import { Avatar, Button, cn, ContentCard, FormField, Icon, PageBody, PageHeader, StatusPill, Table, Td, Th } from "./ui";

/** One size of one product, flattened so the picker and the lines table don't care which product it came from. */
export interface ProductOption {
  key: string;
  productId: string;
  variantId: string;
  name: string;
  nameBn: string;
  size: string;
  price: number;
  /** Units left; null when the size isn't counted (older products). */
  stock: number | null;
  inStock: boolean;
  image: string | null;
  active: boolean;
}

interface Draft {
  lang: "bn" | "en";
  phone: string;
  name: string;
  address: string;
  note: string;
  lines: { key: string; qty: number }[];
  zoneId: string;
  methodId: string;
  trxId: string;
  adminNote: string;
  startConfirmed: boolean;
  sendSms: boolean;
}

const DRAFT_KEY = "mt-admin-order-draft";
const blankDraft = (zones: DeliveryZone[], methods: PaymentMethod[]): Draft => ({
  lang: "bn", phone: "", name: "", address: "", note: "", lines: [], zoneId: zones[0]?.id ?? "", methodId: methods.find((m) => m.enabled)?.id ?? "cod", trxId: "", adminNote: "", startConfirmed: true, sendSms: true,
});
const maxFor = (o: ProductOption) => Math.min(99, o.stock ?? 99);

/** Figma-style Create order: customer, items, delivery and payment on the left; the totals and Create order on the right. */
export function CreateOrder({ options, zones, methods }: { options: ProductOption[]; zones: DeliveryZone[]; methods: PaymentMethod[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => blankDraft(zones, methods));
  const [attempted, setAttempted] = useState(false);
  const [picking, setPicking] = useState(false);
  const [returning, setReturning] = useState<{ orders: number } | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const byKey = useMemo(() => new Map(options.map((o) => [o.key, o])), [options]);

  // A saved draft comes back when the page opens again.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Draft;
      setDraft({ ...blankDraft(zones, methods), ...saved, lines: (saved.lines ?? []).filter((l) => byKey.has(l.key)) });
      toast.info("Your saved draft is back");
    } catch {}
  }, [byKey, zones, methods]);

  const lines = draft.lines.flatMap((l) => (byKey.get(l.key) ? [{ ...l, option: byKey.get(l.key)! }] : []));
  const subtotal = lines.reduce((sum, l) => sum + l.option.price * l.qty, 0);
  const zone = zones.find((z) => z.id === draft.zoneId);
  const fee = zone && lines.length ? deliveryFee(zone, subtotal) : 0;
  const total = subtotal + fee;
  const available = methods.filter((m) => methodAvailable(m, total));
  const method = available.find((m) => m.id === draft.methodId) ?? available[0];
  useEffect(() => {
    if (method && method.id !== draft.methodId) set({ methodId: method.id });
  }, [method, draft.methodId]);

  // Typing a known customer's number fills in their name and address.
  const normal = normalizePhone(draft.phone);
  useEffect(() => {
    setReturning(null);
    if (!normal) return;
    let live = true;
    lookupCustomer(normal).then((found) => {
      if (!live || !found) return;
      setReturning({ orders: found.orders });
      setDraft((d) => ({ ...d, name: d.name || found.name, address: d.address || found.address }));
    }).catch(() => {});
    return () => { live = false; };
  }, [normal]);

  const errors = {
    phone: !normal && "Enter a Bangladeshi mobile number, like 01712345678.",
    name: !draft.name.trim() && "Add the customer's name.",
    address: draft.address.trim().length < 5 && "Add the delivery address.",
    items: lines.length === 0 && "Add at least one product.",
    zone: !zone && "Pick a delivery zone.",
    method: !method && "No payment method fits this order.",
  };
  const shown = (key: keyof typeof errors) => (attempted ? errors[key] || undefined : undefined);

  const addOption = (o: ProductOption) =>
    setDraft((d) => {
      const at = d.lines.findIndex((l) => l.key === o.key);
      return { ...d, lines: at >= 0 ? d.lines.map((l, i) => (i === at ? { ...l, qty: Math.min(maxFor(o), l.qty + 1) } : l)) : [...d.lines, { key: o.key, qty: 1 }] };
    });

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      toast.success("Draft saved on this computer");
    } catch {
      toast.error("This browser can't save drafts");
    }
  };
  const startOver = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraft(blankDraft(zones, methods));
    setAttempted(false);
  };

  const submit = () => {
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) return toast.error("Check the highlighted fields");
    start(async () => {
      const r = await createAdminOrder({
        lang: draft.lang, name: draft.name, phone: draft.phone, address: draft.address, note: draft.note, zoneId: draft.zoneId, methodId: method!.id,
        trxId: draft.trxId, lines: lines.map((l) => ({ id: l.option.productId, variant: l.option.variantId, qty: l.qty })),
        adminNote: draft.adminNote, startConfirmed: draft.startConfirmed, sendSms: draft.sendSms,
      });
      if (!r.ok) return toast.error(r.error);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      toast.success(`Order #${r.no} created`);
      if (r.smsSent === false) toast.error("The order is in, but the confirmation SMS couldn't be sent.");
      router.push(`/admin/orders/${r.id}`);
    });
  };

  const empty = draft.lines.length === 0 && !draft.phone && !draft.name && !draft.address;

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: "Create" }]}
        title="Create order"
        description="For phone, WhatsApp and walk-in customers."
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/admin/orders")}>Cancel</Button>
            <Button variant="outline" disabled={empty} onClick={saveDraft}>Save draft</Button>
            <Button loading={pending} onClick={submit}>Create order</Button>
          </>
        }
      />

      <div className="flex items-start gap-4 max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-4 max-lg:w-full">
          <ContentCard padding="md" title="Customer">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" type="tel" inputMode="tel" value={draft.phone} placeholder="01XXXXXXXXX" error={shown("phone")} onChange={(phone) => set({ phone })} />
              <Input label="Name" value={draft.name} error={shown("name")} onChange={(name) => set({ name })} />
            </div>
            {returning && (
              <div className="flex items-center gap-3 rounded-md bg-brand-subtle px-4 py-3">
                <Avatar name={draft.name || "Customer"} className="size-10" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-label-md text-fg-primary">Returning customer</p>
                  <p className="text-caption text-fg-secondary">{returning.orders} {returning.orders === 1 ? "order" : "orders"} · name and address filled in from their last one</p>
                </div>
              </div>
            )}
            <AddressField value={draft.address} error={shown("address")} onChange={(address) => set({ address })} />
            <FormField label="Customer's language" hint="Used for the product names on the order and the confirmation SMS.">
              <div role="radiogroup" aria-label="Customer's language" className="inline-flex w-fit rounded-full border border-border-strong p-1">
                {(["bn", "en"] as const).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={draft.lang === l} onClick={() => set({ lang: l })} className={cn("rounded-full px-5 py-1.5 text-label-md transition-colors", draft.lang === l ? "bg-brand text-fg-inverse" : "text-fg-secondary hover:bg-muted")}>{l === "bn" ? "বাংলা" : "English"}</button>
                ))}
              </div>
            </FormField>
          </ContentCard>

          <ContentCard flush title="Items" action={<span className="pr-6"><Button variant="secondary" onClick={() => setPicking(true)}>+ Add product</Button></span>}>
            {lines.length > 0 && (
              <Table bare minWidth="min-w-150" widths={["", "w-24", "w-28", "w-28", "w-12"]} head={<><Th>Product</Th><Th>Qty</Th><Th>Price</Th><Th>Total</Th><Th><span className="sr-only">Remove</span></Th></>}>
                {lines.map((l, i) => (
                  <tr key={l.key} className="border-y border-border last:border-b-0">
                    <Td>
                      <div className="flex min-w-0 items-center gap-3">
                        {l.option.image ? <img src={l.option.image} alt="" className="size-11 shrink-0 rounded-sm object-cover" /> : <span className="size-11 shrink-0 rounded-sm bg-muted" />}
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-label-md">{l.option.name}</p>
                          <p className="text-caption text-fg-secondary">{l.option.size}{l.option.stock !== null && ` · ${l.option.stock} in stock`}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <input type="number" min={1} max={maxFor(l.option)} value={l.qty} aria-label={`Quantity of ${l.option.name}, ${l.option.size}`} onChange={(e) => { const qty = Math.round(Number(e.target.value)); if (Number.isFinite(qty)) set({ lines: draft.lines.map((x, j) => (j === i ? { ...x, qty: Math.min(Math.max(qty, 1), maxFor(l.option)) } : x)) }); }} className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-label-md outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand-soft" />
                    </Td>
                    <Td>{taka(l.option.price, "en")}</Td>
                    <Td>{taka(l.option.price * l.qty, "en")}</Td>
                    <Td><button type="button" aria-label={`Remove ${l.option.name}, ${l.option.size}`} onClick={() => set({ lines: draft.lines.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-full text-fg-secondary hover:bg-error-soft hover:text-fg-error"><Icon name="x" /></button></Td>
                  </tr>
                ))}
              </Table>
            )}
            {lines.length === 0 && <p className="px-6 py-8 text-center text-body-sm text-fg-secondary">No products yet. Add one to start the order.</p>}
            {shown("items") && <p className="px-6 pt-3 text-caption text-fg-error">{shown("items")}</p>}
          </ContentCard>

          <ContentCard padding="md" title="Delivery & payment">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Delivery zone" htmlFor="zone" error={shown("zone")}>
                <select id="zone" value={draft.zoneId} onChange={(e) => set({ zoneId: e.target.value })} className="field">
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name.en} · {taka(z.fee, "en")}{z.freeAbove ? ` (free above ${taka(z.freeAbove, "en")})` : ""}</option>)}
                </select>
              </FormField>
              <FormField label="Payment" htmlFor="method" error={shown("method")}>
                <select id="method" value={method?.id ?? ""} onChange={(e) => set({ methodId: e.target.value })} className="field" disabled={available.length === 0}>
                  {available.map((m) => <option key={m.id} value={m.id}>{m.name.en}</option>)}
                </select>
              </FormField>
            </div>
            {method && !isCash(method) && (
              <div className="flex flex-col gap-3 rounded-md bg-muted p-4">
                <p className="text-body-sm text-fg-secondary">{method.instructions.en} <strong className="tabular-nums text-fg-primary">{method.account}</strong>{method.accountType && ` (${method.accountType})`}</p>
                <Input label="Transaction ID (if they've already paid)" value={draft.trxId} onChange={(trxId) => set({ trxId: trxId.toUpperCase() })} hint="You can leave it empty and check it later." />
              </div>
            )}
            <FormField label="Customer's note" htmlFor="cust-note"><input id="cust-note" value={draft.note} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Call before delivery" className="field" /></FormField>
            <FormField label="Internal note" htmlFor="int-note" hint="Only your team sees this."><textarea id="int-note" rows={2} value={draft.adminNote} onChange={(e) => set({ adminNote: e.target.value })} className="field" /></FormField>
          </ContentCard>
        </div>

        <div className="flex w-85 shrink-0 flex-col gap-4 max-lg:w-full lg:sticky lg:top-0">
          <ContentCard padding="md" title="Order summary">
            <dl className="flex flex-col gap-4">
              <Row label="Subtotal" value={taka(subtotal, "en")} />
              <Row label={`Delivery${zone ? ` · ${zone.name.en}` : ""}`} value={!zone || lines.length === 0 ? "—" : fee ? taka(fee, "en") : "Free"} />
              <div className="flex justify-between gap-4 text-h4 text-fg-primary"><dt>Total</dt><dd>{taka(total, "en")}</dd></div>
            </dl>
            <Button className="w-full" loading={pending} onClick={submit}>Create order</Button>
            <SwitchRow label="Start as confirmed" description="You've already agreed it with the customer" checked={draft.startConfirmed} onCheckedChange={(startConfirmed) => set({ startConfirmed })} />
            <SwitchRow label="Send confirmation SMS" checked={draft.sendSms} onCheckedChange={(sendSms) => set({ sendSms })} />
          </ContentCard>
          {!empty && <Button variant="link" size="inline" className="self-center text-fg-secondary" onClick={startOver}>Start over</Button>}
        </div>
      </div>

      <ProductPicker open={picking} onOpenChange={setPicking} options={options} inCart={draft.lines.map((l) => l.key)} onAdd={(o) => { addOption(o); }} />
    </PageBody>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-body-sm">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="font-semibold text-fg-primary">{value}</dd>
    </div>
  );
}

function AddressField({ value, error, onChange }: { value: string; error?: React.ReactNode; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <FormField label="Delivery address" htmlFor={id} error={error}>
      <textarea id={id} rows={2} value={value} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value)} className="field" />
    </FormField>
  );
}

/** "+ Add product": every size on sale, best matches first. Hidden products can be sold by phone, sold-out sizes can't. */
function ProductPicker({ open, onOpenChange, options, inCart, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; options: ProductOption[]; inCart: string[]; onAdd: (option: ProductOption) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (open) setQuery(""); }, [open]);
  const term = query.trim().toLowerCase();
  const results = options.filter((o) => !term || o.name.toLowerCase().includes(term) || o.nameBn.includes(term) || o.size.toLowerCase().includes(term));
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add a product" description="Search by name or size. Tap a row to add one more.">
      <SearchField autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. ghee, 500 g" aria-label="Search products" />
      <ul className="flex max-h-90 flex-col overflow-y-auto rounded-md border border-border">
        {results.length === 0 ? (
          <li className="px-4 py-6 text-center text-body-sm text-fg-secondary">Nothing matches “{query}”.</li>
        ) : results.map((o) => {
          const out = !o.inStock;
          const added = inCart.includes(o.key);
          return (
            <li key={o.key} className="border-b border-border last:border-b-0">
              <button type="button" disabled={out} onClick={() => onAdd(o)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50">
                {o.image ? <img src={o.image} alt="" className="size-10 shrink-0 rounded-sm object-cover" /> : <span className="size-10 shrink-0 rounded-sm bg-muted" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label-md text-fg-primary">{o.name} <span className="font-normal text-fg-secondary">· {o.size}</span></span>
                  <span className="text-caption text-fg-secondary">{out ? "Out of stock" : o.stock === null ? "In stock" : `${o.stock} in stock`}{!o.active && " · hidden on the store"}</span>
                </span>
                {added && <StatusPill tone="info">Added</StatusPill>}
                <span className="shrink-0 text-label-md text-fg-primary">{taka(o.price, "en")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
