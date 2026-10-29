"use client";

import { useEffect, useState, useTransition } from "react";

import { saveStoreSettings } from "@/app/admin/actions";
import { taka } from "@/lib/i18n";
import type { DeliveryZone, Settings } from "@/lib/types";

import { Modal, Switch, SwitchRow, toast } from "./controls";
import { digits, Input, TextPair } from "./fields";
import { HomeTab, type PickerProduct } from "./home-tab";
import { PaymentsTab } from "./payments-tab";
import { Button, cn, ContentCard, PageBody, PageHeader, Table, Td, Th } from "./ui";

export type { PickerProduct } from "./home-tab";

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
  const setZone = (i: number, patch: Partial<DeliveryZone>) => setSettings((s) => ({ ...s, delivery: { zones: s.delivery.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)) } }));
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

        <div className="min-w-0">
          {tab === "store" && (
            <div className="flex flex-col gap-4">
              <ContentCard padding="md" title="Contact" subtitle="Shown in the footer">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input label="Phone" value={settings.store.phone} onChange={(phone) => setStore({ phone })} placeholder="01XXXXXXXXX" />
                  <Input label="WhatsApp (with 880)" value={settings.store.whatsapp} onChange={(whatsapp) => setStore({ whatsapp: digits(whatsapp) })} placeholder="8801XXXXXXXXX" />
                  <Input label="Email" value={settings.store.email} onChange={(email) => setStore({ email })} />
                </div>
                <TextPair label="Address" value={settings.store.address} onChange={(address) => setStore({ address })} />
              </ContentCard>
              <ContentCard padding="md" title="Announcement bar" subtitle="The thin bar above the header. Leave it empty to hide it.">
                <TextPair label="Message" value={settings.store.announcement} onChange={(announcement) => setStore({ announcement })} />
              </ContentCard>
            </div>
          )}

          {tab === "home" && <HomeTab home={settings.home} products={products} onChange={(home) => setSettings((s) => ({ ...s, home }))} />}

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

          {tab === "payments" && <PaymentsTab methods={settings.payments.methods} onChange={(methods) => setSettings((s) => ({ ...s, payments: { methods } }))} />}
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
