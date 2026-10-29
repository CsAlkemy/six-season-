"use client";

import { useState } from "react";

import { taka } from "@/lib/i18n";
import { isCash, PAYMENT_PRESETS, tileFor, type PaymentPreset } from "@/lib/payments";
import type { PaymentMethod } from "@/lib/types";

import { Modal, RowMenu, Switch, toast } from "./controls";
import { digits, Input, TextArea, TextPair } from "./fields";
import { Button, cn, ContentCard, StatusPill } from "./ui";

/** The needs-setup rule: a wallet or bank with nowhere to send money can't be switched on. */
const needsSetup = (m: PaymentMethod) => !isCash(m) && !m.account.trim();

/** A tinted tile with the method's first letter (cash gets a note icon). Brand colours only; these aren't logos. */
function MethodTile({ method }: { method: Pick<PaymentMethod, "id" | "kind" | "name"> }) {
  const [bg, fg] = tileFor(method);
  return (
    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-md border border-border text-label-md" style={{ background: bg, color: fg }}>
      {method.kind === "cash" ? (
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v.01M18 14.5v.01" /></svg>
      ) : (
        <span className="text-h4">{(method.name.en || method.name.bn || "?").charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

function hintOf(m: PaymentMethod): string {
  if (m.kind === "cash") return `Pay at the door · ${m.maxAmount ? `orders up to ${taka(m.maxAmount, "en")}` : "no order limit"}`;
  if (needsSetup(m)) return m.kind === "bank" ? "Add the account details to start taking payments" : "Add your wallet number to start taking payments";
  return [m.accountType, m.account.split("\n")[0]].filter(Boolean).join(" · ");
}

/** The id a new method gets: the preset's own, or its name, made unique among the methods already there. */
function uniqueId(base: string, taken: string[]): string {
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "method";
  let id = slug;
  for (let n = 2; taken.includes(id) || id === "cod"; n++) id = `${slug}-${n}`;
  return id;
}

/**
 * Motherhood's payments pattern: each method is a row with its tile, status and a Set up / Manage button, a switch
 * and a ⋯ menu; the details live in a dialog, and "+ Add method" offers wallets and banks to start from.
 */
export function PaymentsTab({ methods, onChange }: { methods: PaymentMethod[]; onChange: (methods: PaymentMethod[]) => void }) {
  const [adding, setAdding] = useState(false);
  /** The method in the dialog; `index` null means it's new and isn't in the list yet. */
  const [editing, setEditing] = useState<{ index: number | null; method: PaymentMethod } | null>(null);

  const patch = (i: number, change: Partial<PaymentMethod>) => onChange(methods.map((m, j) => (j === i ? { ...m, ...change } : m)));
  const move = (i: number, by: -1 | 1) => {
    const list = [...methods];
    [list[i], list[i + by]] = [list[i + by]!, list[i]!];
    onChange(list);
  };

  const startNew = (preset: PaymentPreset) => {
    const id = preset.id === "custom" ? "" : uniqueId(preset.id, methods.map((m) => m.id));
    setAdding(false);
    setEditing({ index: null, method: { id, kind: preset.kind, name: { ...preset.name }, enabled: false, account: "", accountType: preset.accountType, maxAmount: 0, instructions: { ...preset.instructions } } });
  };

  const apply = (method: PaymentMethod) => {
    if (!method.name.bn.trim() || !method.name.en.trim()) return toast.error("Give the method a name in both languages.");
    const ready = isCash(method) || method.account.trim() !== "";
    const final = { ...method, id: method.id || uniqueId(method.name.en, methods.map((m) => m.id)), enabled: ready && (editing?.index === null ? true : method.enabled) };
    if (editing?.index === null) onChange([...methods, final]);
    else if (editing) patch(editing.index, final);
    setEditing(null);
  };

  const live = methods.filter((m) => m.enabled && !needsSetup(m));

  return (
    <div className="flex flex-col gap-4">
      <ContentCard
        padding="md"
        title="Payment methods"
        subtitle="Cash is paid at the door. Wallets and banks are paid first, then the customer enters the transaction ID."
        action={<Button variant="secondary" onClick={() => setAdding(true)}>+ Add method</Button>}
      >
        <ul className="flex flex-col gap-4">
          {methods.map((m, i) => {
            const setup = needsSetup(m);
            const label = m.name.en || m.name.bn || "Unnamed";
            return (
              <li key={m.id || i} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <MethodTile method={m} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label-md text-fg-primary">{label}{m.name.bn && m.name.bn !== label && <span className="ml-2 font-normal text-fg-tertiary">{m.name.bn}</span>}</span>
                  <span className="truncate text-caption text-fg-secondary">{hintOf(m)}</span>
                </div>
                {m.kind === "cash" ? (
                  <StatusPill tone="neutral">No setup needed</StatusPill>
                ) : setup ? (
                  <StatusPill tone="pending">Setup needed</StatusPill>
                ) : (
                  <StatusPill tone={m.enabled ? "success" : "neutral"}>{m.enabled ? "Live" : "Off"}</StatusPill>
                )}
                <Button variant={setup ? "primary" : "outline"} size="sm" aria-label={`${setup ? "Set up" : m.kind === "cash" ? "Settings for" : "Manage"} ${label}`} onClick={() => setEditing({ index: i, method: structuredClone(m) })}>
                  {setup ? "Set up" : m.kind === "cash" ? "Settings" : "Manage"}
                </Button>
                <Switch checked={m.enabled && !setup} disabled={setup} onCheckedChange={(enabled) => patch(i, { enabled })} aria-label={`${label} on`} />
                <RowMenu
                  label={`More for ${label}`}
                  items={[
                    { label: "Move up", disabled: i === 0, onSelect: () => move(i, -1) },
                    { label: "Move down", disabled: i === methods.length - 1, onSelect: () => move(i, 1) },
                    { separator: true },
                    { label: "Remove", destructive: true, disabled: m.id === "cod", onSelect: () => confirm(`Remove ${label}? Past orders keep their payment details.`) && onChange(methods.filter((_, j) => j !== i)) },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      </ContentCard>

      <ContentCard padding="md" title="What customers see" subtitle="Checkout lists these, in this order. Change the order from each method's ⋯ menu.">
        {live.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">Nothing is switched on yet, so customers can't check out.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {live.map((m) => (
              <li key={m.id} className="flex items-start gap-3 rounded-md border border-border px-4 py-3">
                <MethodTile method={m} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label-md text-fg-primary">{m.name.en}</span>
                  <span className="text-caption text-fg-secondary">{m.instructions.en || "No instructions"}</span>
                  {!isCash(m) && <span className="text-label-md tabular-nums text-fg-primary">{m.account}{m.accountType && <span className="font-normal text-fg-tertiary"> ({m.accountType})</span>}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ContentCard>

      <Modal open={adding} onOpenChange={setAdding} title="Add a payment method" description="Pick one to start from. You can rename it and set its number next.">
        <ul className="flex flex-col gap-3">
          {PAYMENT_PRESETS.map((preset) => {
            const single = preset.id !== "bank" && preset.id !== "custom";
            const added = single && methods.some((m) => m.id === preset.id);
            return (
              <li key={preset.id} className="flex items-center gap-4 rounded-md border border-border px-4 py-3">
                <MethodTile method={{ id: preset.id, kind: preset.kind, name: preset.name.en ? preset.name : { bn: "+", en: "+" } }} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label-md text-fg-primary">{preset.id === "custom" ? "Other wallet" : preset.name.en}</span>
                  <span className="text-caption text-fg-secondary">{preset.hint}</span>
                </div>
                {added ? <StatusPill tone="success">Added</StatusPill> : <Button size="sm" onClick={() => startNew(preset)}>Add</Button>}
              </li>
            );
          })}
        </ul>
      </Modal>

      {editing && <MethodModal key={editing.index ?? "new"} method={editing.method} isNew={editing.index === null} onCancel={() => setEditing(null)} onApply={apply} />}
    </div>
  );
}

/** One method's details: its name, where to send money, a limit and what checkout tells the customer. */
function MethodModal({ method, isNew, onCancel, onApply }: { method: PaymentMethod; isNew: boolean; onCancel: () => void; onApply: (method: PaymentMethod) => void }) {
  const [m, setM] = useState(method);
  const set = (change: Partial<PaymentMethod>) => setM((cur) => ({ ...cur, ...change }));
  const cash = isCash(m);
  const title = cash ? "Cash on delivery" : isNew ? `Add ${m.name.en || "a method"}` : m.name.en || "Payment method";

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onCancel()}
      title={title}
      description={cash ? "No setup needed. Larger orders must be paid online." : "Customers see this at checkout. Applied when you press Save changes."}
      footer={<><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onApply(m)}>{isNew ? "Add method" : "Apply"}</Button></>}
    >
      <div className="flex flex-col gap-4">
        <TextPair label="Name" value={m.name} onChange={(name) => set({ name })} />
        {m.kind === "wallet" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Wallet number" inputMode="tel" value={m.account} placeholder="01XXXXXXXXX" onChange={(account) => set({ account })} />
            <Input label="Account type" value={m.accountType} placeholder="Personal, Merchant…" onChange={(accountType) => set({ accountType })} />
          </div>
        )}
        {m.kind === "bank" && <TextArea label="Account details" rows={3} value={m.account} placeholder={"City Bank · A/C 1234567890\nBranch: Gulshan"} onChange={(account) => set({ account })} hint="Shown to the customer at checkout." />}
        <Input label={cash ? "Largest order paid in cash" : "Largest order"} inputMode="numeric" prefix="৳" value={m.maxAmount} hint="0 means no limit." onChange={(v) => set({ maxAmount: Number(digits(v)) || 0 })} />
        <TextPair label="Instructions at checkout" value={m.instructions} onChange={(instructions) => set({ instructions })} />
      </div>
    </Modal>
  );
}
