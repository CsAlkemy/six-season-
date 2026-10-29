"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { saveStoreSettings } from "@/app/admin/actions";
import { PAYMENT_LABEL, taka } from "@/lib/i18n";
import type { DeliveryZone, HomeSection, PaymentMethod, Settings, Text } from "@/lib/types";

import { Modal, Switch, SwitchRow, toast } from "./controls";
import { uploadPhoto } from "./image-upload";
import { Button, cn, ContentCard, FormField, Icon, PageBody, PageHeader, Spinner, StatusPill, Table, Td, Th } from "./ui";

export type PickerProduct = { id: string; name: Text; image: string | null; active: boolean };

const TABS = [
  { id: "store", label: "Store details" },
  { id: "home", label: "Home page" },
  { id: "delivery", label: "Delivery & zones" },
  { id: "payments", label: "Payments" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Motherhood's layout: a tab list beside the cards (a scroller on phones), one draft across every tab, Save only when something changed. */
export function SettingsForm({ initial, products, initialTab }: { initial: Settings; products: PickerProduct[]; initialTab?: string }) {
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t.id === initialTab)?.id ?? "store");
  const [saved, setSaved] = useState(initial);
  const [settings, setSettings] = useState(initial);
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);
  const go = (next: Tab) => {
    setTab(next);
    history.replaceState(null, "", `?tab=${next}`);
  };

  const setStore = (patch: Partial<Settings["store"]>) => setSettings((s) => ({ ...s, store: { ...s.store, ...patch } }));
  const setHero = (patch: Partial<Settings["home"]["hero"]>) => setSettings((s) => ({ ...s, home: { ...s.home, hero: { ...s.home.hero, ...patch } } }));
  const setSections = (sections: HomeSection[]) => setSettings((s) => ({ ...s, home: { ...s.home, sections } }));
  const setSection = (i: number, patch: Partial<HomeSection>) => setSections(settings.home.sections.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setZone = (i: number, patch: Partial<DeliveryZone>) => setSettings((s) => ({ ...s, delivery: { zones: s.delivery.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)) } }));
  const setMethod = (i: number, patch: Partial<PaymentMethod>) => setSettings((s) => ({ ...s, payments: { methods: s.payments.methods.map((m, j) => (j === i ? { ...m, ...patch } : m)) } }));
  const addZone = () => {
    setSettings((s) => ({ ...s, delivery: { zones: [...s.delivery.zones, { id: "", name: { bn: "", en: "" }, fee: 0, freeAbove: 0, time: { bn: "", en: "" }, active: true }] } }));
    setEditing(settings.delivery.zones.length);
  };

  const onSave = () =>
    start(async () => {
      const r = await saveStoreSettings(settings);
      if (!r.ok) return toast.error(r.error);
      setSaved(settings);
      toast.success("Saved. The store updates within a minute.");
    });

  const zone = editing === null ? null : settings.delivery.zones[editing];

  return (
    <PageBody>
      <PageHeader
        title="Settings"
        actions={
          <>
            <Button variant="outline" disabled={!dirty || pending} onClick={() => setSettings(saved)}>Discard</Button>
            <Button disabled={!dirty} loading={pending} onClick={onSave}>Save changes</Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings" className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 max-lg:flex-row max-lg:overflow-x-auto max-lg:p-1.5 lg:sticky lg:top-0">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined} className={cn("shrink-0 rounded-md px-3 py-3 text-left text-label-md whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-brand", tab === t.id ? "bg-brand-soft text-fg-brand" : "text-fg-secondary hover:bg-muted hover:text-fg-primary")}>{t.label}</button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          {tab === "store" && (
            <>
              <ContentCard title="Contact" subtitle="Shown in the footer">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input label="Phone" value={settings.store.phone} onChange={(phone) => setStore({ phone })} placeholder="01XXXXXXXXX" />
                  <Input label="WhatsApp (with 880)" value={settings.store.whatsapp} onChange={(whatsapp) => setStore({ whatsapp })} placeholder="8801XXXXXXXXX" />
                  <Input label="Email" value={settings.store.email} onChange={(email) => setStore({ email })} />
                </div>
                <TextPair label="Address" value={settings.store.address} onChange={(address) => setStore({ address })} />
              </ContentCard>
              <ContentCard title="Announcement bar" subtitle="The thin bar above the header; leave it empty to hide it">
                <TextPair label="Message" value={settings.store.announcement} onChange={(announcement) => setStore({ announcement })} />
              </ContentCard>
            </>
          )}

          {tab === "home" && (
            <>
              <ContentCard title="Hero" subtitle="A banner above the products, off until you switch it on" action={<Switch aria-label="Show hero" checked={settings.home.hero.enabled} onCheckedChange={(enabled) => setHero({ enabled })} />}>
                <div className={cn("flex flex-col gap-4", !settings.home.hero.enabled && "pointer-events-none opacity-50")} aria-disabled={!settings.home.hero.enabled}>
                  <TextPair label="Title" value={settings.home.hero.title} onChange={(title) => setHero({ title })} />
                  <TextPair label="Subtitle" value={settings.home.hero.subtitle} onChange={(subtitle) => setHero({ subtitle })} />
                  <TextPair label="Button (empty hides it)" value={settings.home.hero.cta} onChange={(cta) => setHero({ cta })} />
                  <HeroImage url={settings.home.hero.image} onChange={(image) => setHero({ image })} />
                </div>
              </ContentCard>

              <ContentCard
                title="Product sections"
                subtitle="Hand-picked rows above the full list, like “Best sellers” or “New this week”"
                action={<Button variant="secondary" onClick={() => setSections([...settings.home.sections, { id: "", enabled: true, title: { bn: "", en: "" }, subtitle: { bn: "", en: "" }, productIds: [] }])}>+ Add section</Button>}
              >
                {settings.home.sections.length === 0 && <p className="rounded-md border border-dashed border-border-strong px-6 py-8 text-center text-body-sm text-fg-secondary">No sections yet. The store opens straight on all products.</p>}
                <div className="flex flex-col gap-4">
                  {settings.home.sections.map((section, i) => (
                    <SectionEditor
                      key={i}
                      section={section}
                      products={products}
                      first={i === 0}
                      last={i === settings.home.sections.length - 1}
                      onChange={(patch) => setSection(i, patch)}
                      onMove={(by) => { const list = [...settings.home.sections]; [list[i], list[i + by]] = [list[i + by]!, list[i]!]; setSections(list); }}
                      onRemove={() => setSections(settings.home.sections.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              </ContentCard>
            </>
          )}

          {tab === "delivery" && (
            <ContentCard title="Delivery zones" subtitle="Areas customers pick at checkout. “Free above” 0 means delivery is never free." flush action={<span className="pr-6"><Button variant="secondary" onClick={addZone}>+ Add zone</Button></span>}>
              <Table bare minWidth="min-w-160" widths={["", "w-28", "w-32", "w-32", "w-20", "w-24"]} head={<><Th>Zone</Th><Th>Fee</Th><Th>Free above</Th><Th>Time</Th><Th>Status</Th><Th><span className="sr-only">Edit</span></Th></>}>
                {settings.delivery.zones.map((z, i) => (
                  <tr key={i} className="border-y border-border last:border-b-0">
                    <Td><p className={cn("truncate text-label-md", z.active ? "text-fg-primary" : "text-fg-tertiary")}>{z.name.en || "Unnamed zone"}</p><p className="truncate text-caption text-fg-secondary">{z.name.bn}</p></Td>
                    <Td>{taka(z.fee, "en")}</Td>
                    <Td>{z.freeAbove ? taka(z.freeAbove, "en") : "Never"}</Td>
                    <Td>{z.time.en || "—"}</Td>
                    <Td><Switch aria-label={`${z.name.en || "Zone"} on`} checked={z.active} onCheckedChange={(active) => setZone(i, { active })} /></Td>
                    <Td className="text-right"><Button variant="outline" size="sm" onClick={() => setEditing(i)}>Edit</Button></Td>
                  </tr>
                ))}
              </Table>
            </ContentCard>
          )}

          {tab === "payments" && (
            <ContentCard title="Payment methods" subtitle="bKash and Nagad need your wallet number: customers send money and enter the TrxID.">
              <div className="flex flex-col gap-4">
                {settings.payments.methods.map((method, i) => (
                  <div key={method.id} className={cn("flex flex-col gap-4 rounded-lg border p-4 sm:p-5", method.enabled ? "border-border-brand bg-brand-subtle" : "border-border")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5"><p className="text-label-md text-fg-primary">{PAYMENT_LABEL[method.id].en}</p><StatusPill tone={method.enabled ? "success" : "neutral"}>{method.enabled ? "On" : "Off"}</StatusPill></div>
                      <Switch aria-label={`${PAYMENT_LABEL[method.id].en} on`} checked={method.enabled} onCheckedChange={(enabled) => setMethod(i, { enabled })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {method.id !== "cod" && (
                        <>
                          <Input label="Wallet number" value={method.account} onChange={(account) => setMethod(i, { account })} placeholder="01XXXXXXXXX" />
                          <Input label="Account type" value={method.accountType} onChange={(accountType) => setMethod(i, { accountType })} placeholder="Personal" />
                        </>
                      )}
                      <Input label="Largest order (৳, 0 = no limit)" type="number" value={method.maxAmount} onChange={(v) => setMethod(i, { maxAmount: Number(v) })} />
                    </div>
                    <TextPair label="Instructions at checkout" value={method.instructions} onChange={(instructions) => setMethod(i, { instructions })} />
                  </div>
                ))}
              </div>
            </ContentCard>
          )}
        </div>
      </div>

      <Modal
        open={zone !== null && editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={zone?.name.en || "New delivery zone"}
        description="What customers in this area pay and how long it takes."
        footer={
          <>
            <Button variant="outline" onClick={() => { if (editing !== null) setSettings((s) => ({ ...s, delivery: { zones: s.delivery.zones.filter((_, j) => j !== editing) } })); setEditing(null); }}>Remove zone</Button>
            <Button onClick={() => setEditing(null)}>Done</Button>
          </>
        }
      >
        {zone && editing !== null && (
          <div className="flex flex-col gap-4">
            <TextPair label="Zone name" value={zone.name} onChange={(name) => setZone(editing, { name })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Fee (৳)" type="number" value={zone.fee} onChange={(v) => setZone(editing, { fee: Number(v) })} />
              <Input label="Free above (৳)" type="number" value={zone.freeAbove} onChange={(v) => setZone(editing, { freeAbove: Number(v) })} />
            </div>
            <TextPair label="Delivery time" value={zone.time} onChange={(time) => setZone(editing, { time })} />
            <SwitchRow label="Active" description="Customers can pick this zone at checkout" checked={zone.active} onCheckedChange={(active) => setZone(editing, { active })} />
          </div>
        )}
      </Modal>
    </PageBody>
  );
}

function HeroImage({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <FormField label="Background photo (optional)">
      {url ? (
        <div className="relative overflow-hidden rounded-md border border-border">
          <img src={url} alt="" className="aspect-[3/1] w-full object-cover" />
          <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => onChange(null)}>Remove</Button>
        </div>
      ) : (
        <button type="button" aria-label="Add a background photo" onClick={() => input.current?.click()} className="flex aspect-[4/1] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-brand bg-brand-subtle text-caption text-fg-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
          {busy ? <Spinner className="size-5" /> : <><Icon name="plus" />Add a wide photo</>}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setBusy(true);
        const r = await uploadPhoto(file, "home");
        setBusy(false);
        if ("url" in r) onChange(r.url);
        else toast.error(r.error);
      }} />
    </FormField>
  );
}

function SectionEditor({ section, products, first, last, onChange, onMove, onRemove }: { section: HomeSection; products: PickerProduct[]; first: boolean; last: boolean; onChange: (patch: Partial<HomeSection>) => void; onMove: (by: -1 | 1) => void; onRemove: () => void }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const chosen = section.productIds.map((id) => byId.get(id)).filter((p): p is PickerProduct => Boolean(p));
  const available = products.filter((p) => !section.productIds.includes(p.id));
  const shift = (i: number, by: -1 | 1) => { const ids = [...section.productIds]; [ids[i], ids[i + by]] = [ids[i + by]!, ids[i]!]; onChange({ productIds: ids }); };
  const pickerId = useId();
  const iconButton = "grid size-8 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-muted hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SwitchRow label="Show on store" checked={section.enabled} onCheckedChange={(enabled) => onChange({ enabled })} className="gap-3" />
        <span className="flex items-center gap-1">
          <button type="button" disabled={first} onClick={() => onMove(-1)} aria-label="Move section up" className={iconButton}>↑</button>
          <button type="button" disabled={last} onClick={() => onMove(1)} aria-label="Move section down" className={iconButton}>↓</button>
          <Button variant="link" size="inline" className="ml-2 text-fg-error" onClick={() => confirm("Remove this section?") && onRemove()}>Remove</Button>
        </span>
      </div>
      <TextPair label="Title" value={section.title} onChange={(title) => onChange({ title })} />
      <TextPair label="Subtitle (optional)" value={section.subtitle} onChange={(subtitle) => onChange({ subtitle })} />
      <FormField label={`Products in this section · ${chosen.length}`} htmlFor={pickerId}>
        {chosen.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border">
            {chosen.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                {p.image ? <img src={p.image} alt="" className="size-9 rounded-sm object-cover" /> : <span className="size-9 rounded-sm bg-muted" />}
                <span className="min-w-0 flex-1 truncate text-body-sm">{p.name.en}{!p.active && <span className="ml-2 text-caption text-fg-tertiary">hidden</span>}</span>
                <button type="button" disabled={i === 0} onClick={() => shift(i, -1)} aria-label="Move earlier" className={iconButton}>←</button>
                <button type="button" disabled={i === chosen.length - 1} onClick={() => shift(i, 1)} aria-label="Move later" className={iconButton}>→</button>
                <button type="button" onClick={() => onChange({ productIds: section.productIds.filter((id) => id !== p.id) })} aria-label={`Remove ${p.name.en}`} className={cn(iconButton, "hover:bg-error-soft hover:text-fg-error")}><Icon name="x" /></button>
              </li>
            ))}
          </ul>
        )}
        {available.length > 0 && (
          <select id={pickerId} value="" onChange={(e) => e.target.value && onChange({ productIds: [...section.productIds, e.target.value] })} className="field">
            <option value="">+ Add a product…</option>
            {available.map((p) => <option key={p.id} value={p.id}>{p.name.en}{p.active ? "" : " (hidden)"}</option>)}
          </select>
        )}
      </FormField>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id}>
      <input id={id} type={type} min={type === "number" ? 0 : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field" />
    </FormField>
  );
}

function TextPair({ label, value, onChange }: { label: string; value: Text; onChange: (value: Text) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label={`${label} · বাংলা`} value={value.bn} onChange={(bn) => onChange({ ...value, bn })} />
      <Input label={`${label} · English`} value={value.en} onChange={(en) => onChange({ ...value, en })} />
    </div>
  );
}
