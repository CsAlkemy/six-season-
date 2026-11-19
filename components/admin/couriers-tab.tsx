"use client";

import { useId, useState, useTransition } from "react";

import { connectCourier, type CourierKeysInput, disconnectCourier, saveCourierDefaults } from "@/app/admin/actions";
import { COURIER_NAME, type CouriersView, type CourierView, type Place } from "@/lib/couriers/meta";
import type { CourierId } from "@/lib/types";

import { Modal, RowMenu, SwitchRow, toast } from "./controls";
import { Input } from "./fields";
import { Button, Callout, ContentCard, FormField, StatusPill } from "./ui";

/** Where each courier keeps what the store needs, and what to paste back into it. */
const HELP: Record<CourierId, { keys: string; webhook: string; sandbox: boolean }> = {
  steadfast: {
    keys: "Steadfast panel › API: the API key and secret key. Steadfast has no test mode, so every parcel booked here is real.",
    webhook: "Steadfast panel › API › Webhook: paste the URL as the Callback URL and the secret as the Auth token.",
    sandbox: false,
  },
  pathao: {
    keys: "Pathao merchant panel › Developer API › Merchant API Credentials: the client ID and secret. With them, the email and password you log in to the panel with.",
    webhook: "Pathao panel › Developer API › Webhook Integration: paste the URL and the secret, and choose all events.",
    sandbox: true,
  },
  carrybee: {
    keys: "CarryBee merchant panel › Developers › API Integration: the Client ID, Client Secret and Client Context.",
    webhook: "CarryBee panel › Webhook Setup: paste the URL and the secret, and choose all events.",
    sandbox: true,
  },
};

/** The courier's first letter on its brand colour; these aren't logos. */
const TILE: Record<CourierId, [string, string]> = { steadfast: ["#e6f4ee", "#0b7a4b"], pathao: ["#fde8e8", "#d71920"], carrybee: ["#fff4d6", "#9a6b00"] };

function Tile({ id }: { id: CourierId }) {
  const [bg, fg] = TILE[id];
  return <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-md border border-border text-h4" style={{ background: bg, color: fg }}>{COURIER_NAME[id].en.charAt(0)}</span>;
}

/** A value to paste somewhere else, with a button that copies it. */
function CopyField({ label, value }: { label: string; value: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  return (
    <FormField label={label} htmlFor={id}>
      <div className="flex gap-2">
        <input id={id} readOnly value={value} onFocus={(e) => e.target.select()} className="field min-w-0 flex-1 font-mono text-body-sm" />
        <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>{copied ? "Copied" : "Copy"}</Button>
      </div>
    </FormField>
  );
}

/**
 * Settings › Couriers: connect Steadfast, Pathao and CarryBee with their keys (checked with the courier before they're
 * saved, and never sent back to the page), pick the default, and copy each one's webhook details into its panel.
 */
export function CouriersTab({ initial, onSaved }: { initial: CouriersView; onSaved: (view: CouriersView) => void }) {
  const [view, setViewHere] = useState(initial);
  const setView = (next: CouriersView) => {
    setViewHere(next);
    onSaved(next);
  };
  const [editing, setEditing] = useState<CourierView | null>(null);
  const [defaults, setDefaults] = useState(initial.defaults);
  const [busy, start] = useTransition();
  const live = view.couriers.filter((c) => c.connected);
  const defaultsDirty = JSON.stringify(defaults) !== JSON.stringify(view.defaults);

  const disconnect = (c: CourierView) => {
    if (!confirm(`Disconnect ${COURIER_NAME[c.id].en}? Its keys are removed. Parcels already booked keep their tracking, but their status stops updating.`)) return;
    start(async () => {
      const r = await disconnectCourier(c.id);
      if (!r.ok) return toast.error(r.error);
      setView(r.view);
      setDefaults(r.view.defaults);
      toast.success(`${COURIER_NAME[c.id].en} disconnected`);
    });
  };

  const saveDefaults = () =>
    start(async () => {
      const r = await saveCourierDefaults({ courier: defaults.courier, weightKg: defaults.weightKg });
      if (!r.ok) return toast.error(r.error);
      setView(r.view);
      setDefaults(r.view.defaults);
      toast.success("Saved");
    });

  return (
    <div className="flex flex-col gap-4">
      {view.couriers.some((c) => c.unreadable) && <Callout tone="error">The saved courier keys can't be read, because ADMIN_SECRET has changed since they were saved. Connect each courier again.</Callout>}
      <ContentCard padding="md" title="Couriers" subtitle="Book parcels and follow them from each order's page. Keys are checked with the courier before they're saved.">
        <ul className="flex flex-col gap-4">
          {view.couriers.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <Tile id={c.id} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-label-md text-fg-primary">{COURIER_NAME[c.id].en}{view.defaults.courier === c.id && live.length > 1 && <span className="ml-2 font-normal text-fg-tertiary">Default</span>}</span>
                <span className="truncate text-caption text-fg-secondary">{c.connected ? c.summary.join(" · ") : "Not connected"}</span>
              </div>
              {c.connected ? <StatusPill tone={c.sandbox ? "pending" : "success"}>{c.sandbox ? "Sandbox" : "Connected"}</StatusPill> : <StatusPill tone="neutral">Off</StatusPill>}
              <Button variant={c.connected ? "outline" : "primary"} size="sm" onClick={() => setEditing(c)} aria-label={`${c.connected ? "Manage" : "Connect"} ${COURIER_NAME[c.id].en}`}>{c.connected ? "Manage" : "Connect"}</Button>
              {c.connected && <RowMenu label={`More for ${COURIER_NAME[c.id].en}`} items={[{ label: "Disconnect", destructive: true, disabled: busy, onSelect: () => disconnect(c) }]} />}
            </li>
          ))}
        </ul>
      </ContentCard>

      {live.length > 0 && (
        <ContentCard padding="md" title="Booking defaults" subtitle="What the booking form starts with. You can change both for each parcel.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Default courier" htmlFor="default-courier">
              <select id="default-courier" value={defaults.courier} onChange={(e) => setDefaults((d) => ({ ...d, courier: e.target.value as CourierId }))} className="field">
                {live.map((c) => <option key={c.id} value={c.id}>{COURIER_NAME[c.id].en}</option>)}
              </select>
            </FormField>
            <Input label="Parcel weight (kg)" type="number" inputMode="decimal" value={defaults.weightKg} onChange={(v) => setDefaults((d) => ({ ...d, weightKg: Number(v) }))} hint="Pathao takes 0.5 to 10 kg." />
          </div>
          <Button className="self-end" loading={busy} disabled={!defaultsDirty} onClick={saveDefaults}>Save defaults</Button>
        </ContentCard>
      )}

      {live.map((c) => (
        <ContentCard key={c.id} padding="md" title={`${COURIER_NAME[c.id].en} status updates`} subtitle={HELP[c.id].webhook}>
          <CopyField label="Webhook URL" value={c.webhook.url} />
          <CopyField label={c.id === "steadfast" ? "Auth token" : "Secret"} value={c.webhook.secret} />
          <p className="text-caption text-fg-tertiary">Without this the status still updates when you open an order, or press “Refresh courier statuses” on the Orders page.</p>
        </ContentCard>
      ))}

      {editing && (
        <ConnectModal
          key={editing.id}
          courier={editing}
          onClose={() => setEditing(null)}
          onConnected={(next, message) => {
            setView(next);
            setDefaults(next.defaults);
            setEditing(null);
            toast.success(message);
          }}
        />
      )}
    </div>
  );
}

/** The keys for one courier; for Pathao and CarryBee, then the store parcels are picked up from. */
function ConnectModal({ courier, onClose, onConnected }: { courier: CourierView; onClose: () => void; onConnected: (view: CouriersView, message: string) => void }) {
  const { id } = courier;
  const name = COURIER_NAME[id].en;
  const [form, setForm] = useState<CourierKeysInput>({ courier: id, sandbox: courier.sandbox, clientId: courier.fields.clientId ?? "", username: courier.fields.username ?? "", storeId: courier.fields.storeId ?? "" });
  const [stores, setStores] = useState<(Place & { approved: boolean })[] | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const set = (patch: Partial<CourierKeysInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    // New keys: the store list has to be fetched again.
    if (!("storeId" in patch)) setStores(null);
  };
  const kept = (key: string) => (courier.saved.includes(key) ? "Saved. Leave empty to keep it." : undefined);

  const submit = () =>
    start(async () => {
      setError("");
      // The saved store goes along, so re-saving a connected courier is one step while that store still exists.
      const r = await connectCourier(form);
      if (!r.ok) return setError(r.error);
      if ("stores" in r) {
        setStores(r.stores);
        const first = r.stores.find((s) => s.approved);
        setForm((f) => ({ ...f, storeId: r.stores.some((s) => String(s.id) === f.storeId && s.approved) ? f.storeId : first ? String(first.id) : "" }));
        return;
      }
      onConnected(r.view, r.message);
    });

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={courier.connected ? name : `Connect ${name}`}
      description={HELP[id].keys}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>{stores ? "Save" : "Check and save"}</Button></>}
    >
      <div className="flex flex-col gap-4">
        {HELP[id].sandbox && <SwitchRow label="Sandbox (test) account" description="Parcels booked in the sandbox are never picked up. Use your live keys to ship." checked={form.sandbox} onCheckedChange={(sandbox) => set({ sandbox })} />}
        {id === "steadfast" && (
          <>
            <Input label="API key" type="password" value={form.apiKey ?? ""} onChange={(apiKey) => set({ apiKey })} placeholder={kept("apiKey")} />
            <Input label="Secret key" type="password" value={form.secretKey ?? ""} onChange={(secretKey) => set({ secretKey })} placeholder={kept("secretKey")} />
          </>
        )}
        {id !== "steadfast" && (
          <>
            <Input label="Client ID" value={form.clientId ?? ""} onChange={(clientId) => set({ clientId })} />
            <Input label="Client secret" type="password" value={form.clientSecret ?? ""} onChange={(clientSecret) => set({ clientSecret })} placeholder={kept("clientSecret")} />
          </>
        )}
        {id === "pathao" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Merchant email" type="email" value={form.username ?? ""} onChange={(username) => set({ username })} />
            <Input label="Merchant password" type="password" value={form.password ?? ""} onChange={(password) => set({ password })} placeholder={kept("password")} />
          </div>
        )}
        {id === "carrybee" && <Input label="Client context" type="password" value={form.clientContext ?? ""} onChange={(clientContext) => set({ clientContext })} placeholder={kept("clientContext")} />}
        {stores && (
          <FormField label="Pickup store" htmlFor="pickup-store" hint="Where the courier collects parcels. Add or change stores in the courier's panel.">
            <select id="pickup-store" value={form.storeId} onChange={(e) => set({ storeId: e.target.value })} className="field">
              {stores.map((s) => <option key={s.id} value={String(s.id)} disabled={!s.approved}>{s.name}{s.approved ? "" : " (not approved yet)"}</option>)}
            </select>
          </FormField>
        )}
        {stores && <p className="text-caption text-fg-success">The keys work. Pick the store, then save.</p>}
        {error && <Callout tone="error">{error}</Callout>}
      </div>
    </Modal>
  );
}
