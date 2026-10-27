"use client";

import { useState, useTransition } from "react";

import { saveStoreSettings } from "@/app/admin/actions";
import { PAYMENT_LABEL } from "@/lib/i18n";
import type { DeliveryZone, PaymentMethod, Settings, Text } from "@/lib/types";

export function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const setStore = (patch: Partial<Settings["store"]>) => setSettings((s) => ({ ...s, store: { ...s.store, ...patch } }));
  const setZone = (i: number, patch: Partial<DeliveryZone>) =>
    setSettings((s) => ({ ...s, delivery: { zones: s.delivery.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)) } }));
  const setMethod = (i: number, patch: Partial<PaymentMethod>) =>
    setSettings((s) => ({ ...s, payments: { methods: s.payments.methods.map((m, j) => (j === i ? { ...m, ...patch } : m)) } }));

  const addZone = () =>
    setSettings((s) => ({
      ...s,
      delivery: {
        zones: [...s.delivery.zones, { id: "", name: { bn: "", en: "" }, fee: 0, freeAbove: 0, time: { bn: "", en: "" }, active: true }],
      },
    }));
  const removeZone = (i: number) =>
    setSettings((s) => ({ ...s, delivery: { zones: s.delivery.zones.filter((_, j) => j !== i) } }));

  const onSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveStoreSettings(JSON.stringify(settings));
      setMessage(result.ok ? { ok: true, text: "Saved. The store updates within a minute." } : { ok: false, text: result.error ?? "Couldn't save." });
    });
  };

  return (
    <div className="space-y-6 pb-24">
      <Section title="Store" lead="Shown in the footer and the bar above the header.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Phone" value={settings.store.phone} onChange={(phone) => setStore({ phone })} placeholder="01XXXXXXXXX" />
          <Input label="WhatsApp (with 880)" value={settings.store.whatsapp} onChange={(whatsapp) => setStore({ whatsapp })} placeholder="8801XXXXXXXXX" />
          <Input label="Email" value={settings.store.email} onChange={(email) => setStore({ email })} />
        </div>
        <TextPair label="Address" value={settings.store.address} onChange={(address) => setStore({ address })} />
        <TextPair label="Announcement bar (empty hides it)" value={settings.store.announcement} onChange={(announcement) => setStore({ announcement })} />
      </Section>

      <Section title="Delivery" lead="Areas customers pick at checkout. Free-above 0 means delivery is never free.">
        {settings.delivery.zones.map((zone, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <Toggle label="Active" checked={zone.active} onChange={(active) => setZone(i, { active })} />
              <button type="button" onClick={() => removeZone(i)} className="text-body-sm font-semibold text-fg-error">Remove</button>
            </div>
            <TextPair label="Area name" value={zone.name} onChange={(name) => setZone(i, { name })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Fee (৳)" type="number" value={zone.fee} onChange={(v) => setZone(i, { fee: Number(v) })} />
              <Input label="Free above (৳)" type="number" value={zone.freeAbove} onChange={(v) => setZone(i, { freeAbove: Number(v) })} />
            </div>
            <TextPair label="Delivery time" value={zone.time} onChange={(time) => setZone(i, { time })} />
          </div>
        ))}
        <button type="button" onClick={addZone} className="btn-secondary">Add delivery area</button>
      </Section>

      <Section title="Payments" lead="Switch on the ways customers can pay. bKash and Nagad need your wallet number; customers send money and enter the TrxID.">
        {settings.payments.methods.map((method, i) => (
          <div key={method.id} className={`space-y-3 rounded-lg border p-4 ${method.enabled ? "border-brand" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <p className="text-h4">{PAYMENT_LABEL[method.id].en}</p>
              <Toggle label={method.enabled ? "On" : "Off"} checked={method.enabled} onChange={(enabled) => setMethod(i, { enabled })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {method.id !== "cod" && (
                <>
                  <Input label="Wallet number" value={method.account} onChange={(account) => setMethod(i, { account })} placeholder="01XXXXXXXXX" />
                  <Input label="Account type" value={method.accountType} onChange={(accountType) => setMethod(i, { accountType })} placeholder="Personal" />
                </>
              )}
              <Input label="Max order (৳, 0 = no limit)" type="number" value={method.maxAmount} onChange={(v) => setMethod(i, { maxAmount: Number(v) })} />
            </div>
            <TextPair label="Instructions at checkout" value={method.instructions} onChange={(instructions) => setMethod(i, { instructions })} />
          </div>
        ))}
      </Section>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-end gap-4">
          {message && <p className={`text-body-sm ${message.ok ? "text-fg-sage" : "text-fg-error"}`} role="status">{message.text}</p>}
          <button type="button" onClick={onSave} disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-6">
      <div>
        <h2 className="text-h3">{title}</h2>
        <p className="text-body-sm text-fg-secondary">{lead}</p>
      </div>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input type={type} min={type === "number" ? 0 : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field" />
    </label>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-body-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-(--bg-brand)" />
      {label}
    </label>
  );
}
