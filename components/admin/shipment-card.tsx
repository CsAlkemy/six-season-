"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { bookParcel, cancelParcel, courierPlaces, guessPlace, linkParcel, refreshParcel, removeParcel } from "@/app/admin/actions";
import { COURIER_NAME, FAILED_STAGES, FINAL_STAGES, type Place, STAGE_LABEL, STAGE_TONE } from "@/lib/couriers/meta";
import { taka } from "@/lib/i18n";
import { dhakaTime } from "@/lib/orders";
import { paymentIsCash } from "@/lib/payments";
import { COURIERS, type CourierId, type Order } from "@/lib/types";

import { Modal, RowMenu, toast } from "./controls";
import { Input } from "./fields";
import { Button, buttonClass, Callout, ContentCard, FormField, Labelled, StatusPill } from "./ui";

/** A connected courier, as the order page knows it. */
export interface CourierOption {
  id: CourierId;
  /** Has its own city / zone / area lists. */
  places: boolean;
  /** Can't book without a city and zone (CarryBee); Pathao reads them from the address unless picked. */
  placeRequired: boolean;
  /** Takes a cancellation by API. */
  cancels: boolean;
}

/** Older than this, an open order asks the courier for news by itself. */
const STALE_MS = 15 * 60_000;

/**
 * The order's courier card: book a parcel with a connected courier (or link one booked in the courier's panel), then
 * follow it. Opening an order whose parcel news is stale asks the courier once, quietly.
 */
export function ShipmentCard({ order, couriers, defaults }: { order: Order; couriers: CourierOption[]; defaults: { courier: string; weightKg: number } }) {
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [busy, start] = useTransition();
  const shipment = order.shipment;
  const connected = shipment ? couriers.find((c) => c.id === shipment.courier) : undefined;
  const failedParcel = shipment && FAILED_STAGES.includes(shipment.stage);
  const bookable = order.status === "confirmed" || order.status === "packing" || order.status === "shipped";

  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || !shipment || !connected || FINAL_STAGES.includes(shipment.stage) || order.status === "cancelled") return;
    if (Date.now() - Date.parse(shipment.checkedAt ?? shipment.updatedAt) < STALE_MS) return;
    asked.current = true;
    refreshParcel(order.id).then((r) => r.ok && r.changed && router.refresh()).catch(() => {});
  }, [shipment, connected, order.id, order.status, router]);

  const run = (job: () => Promise<{ ok: true } | { ok: true; changed: boolean } | { ok: false; error: string }>, done: string) =>
    start(async () => {
      const r = await job();
      if (r.ok) toast.success(done);
      else toast.error(r.error);
      router.refresh();
    });

  if (order.status === "cancelled" && !shipment) return null;

  const bookButton = (label: string) =>
    couriers.length ? (
      <Button className="w-full" disabled={!bookable} onClick={() => setBooking(true)}>{label}</Button>
    ) : (
      <p className="text-body-sm text-fg-secondary">Connect Steadfast, Pathao or CarryBee in <Link href="/admin/settings?tab=couriers" className="text-fg-brand underline underline-offset-4">Settings › Couriers</Link> to book parcels from here.</p>
    );

  return (
    <>
      <ContentCard title="Courier" action={shipment && <StatusPill tone={STAGE_TONE[shipment.stage]}>{STAGE_LABEL[shipment.stage]}</StatusPill>}>
        {!shipment ? (
          <>
            {order.status === "new" && <p className="text-body-sm text-fg-secondary">Confirm the order to book a courier or add its tracking.</p>}
            {order.status !== "new" && order.status !== "delivered" && bookButton("Book a parcel")}
            {order.status !== "new" && <Button variant="link" size="inline" className="self-start" onClick={() => setLinking(true)}>Add tracking by hand</Button>}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <Labelled label={COURIER_NAME[shipment.courier].en}>
                <span className="font-mono">{shipment.consignmentId}</span>
              </Labelled>
              <RowMenu
                label="More for this parcel"
                items={[
                  ...(connected?.cancels && shipment.stage === "booked" ? [{ label: "Cancel parcel", onSelect: () => { const reason = prompt("Why is it cancelled? (optional)", "") ; if (reason !== null) run(() => cancelParcel(order.id, reason), "Cancellation sent. It shows as cancelled once CarryBee confirms."); } }] : []),
                  { label: "Remove from this order", destructive: true, onSelect: () => confirm(`Remove this parcel from the order? Its record at ${COURIER_NAME[shipment.courier].en} isn't touched${shipment.stage === "booked" ? ": cancel it there too if it shouldn't be picked up" : ""}.`) && run(() => removeParcel(order.id), "Parcel removed") },
                ]}
              />
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {shipment.trackingCode && <Labelled label="Tracking code"><span className="font-mono">{shipment.trackingCode}</span></Labelled>}
              <Labelled label="Collect">{shipment.cod ? taka(shipment.cod, "en") : "Nothing (paid)"}</Labelled>
              {shipment.fee !== undefined && <Labelled label="Courier charge">{taka(shipment.fee, "en")}</Labelled>}
              <Labelled label="Invoice">{shipment.invoice}</Labelled>
            </dl>
            <p className="text-caption text-fg-secondary">
              {COURIER_NAME[shipment.courier].en} says “{shipment.status.replace(/_/g, " ")}” · {dhakaTime(shipment.updatedAt)}
              {shipment.manual && " · added by hand"}
            </p>
            {failedParcel && (
              <Callout tone="error">
                {shipment.stage === "cancelled" ? "This parcel was cancelled." : shipment.stage === "returned" ? "It's back with you." : "The courier is bringing it back."}{" "}
                {order.status === "cancelled" ? "The order is cancelled." : "Cancel the order to put its items back on the shelf, or book it again."}
              </Callout>
            )}
            {shipment.events && shipment.events.length > 1 && (
              <details className="text-body-sm">
                <summary className="cursor-pointer text-fg-secondary">History</summary>
                <ol className="mt-2 flex flex-col gap-1.5">
                  {[...shipment.events].reverse().map((e, i) => (
                    <li key={i} className="flex flex-col"><span className="text-fg-primary">{e.status.replace(/_/g, " ")}{e.note ? ` · ${e.note}` : ""}</span><span className="text-caption text-fg-tertiary">{dhakaTime(e.at)}</span></li>
                  ))}
                </ol>
              </details>
            )}
            <div className="flex flex-wrap gap-2">
              {connected && !FINAL_STAGES.includes(shipment.stage) && <Button variant="outline" size="sm" loading={busy} onClick={() => run(() => refreshParcel(order.id), "Status checked")}>Refresh status</Button>}
              {shipment.trackingUrl && <a href={shipment.trackingUrl} target="_blank" rel="noopener" className={buttonClass("outline", "sm")}>Tracking page</a>}
              {failedParcel && bookable && couriers.length > 0 && <Button size="sm" onClick={() => setBooking(true)}>Book again</Button>}
            </div>
            {!connected && <p className="text-caption text-fg-tertiary">{COURIER_NAME[shipment.courier].en} isn't connected, so this status won't update here.</p>}
          </>
        )}
      </ContentCard>
      {booking && <BookModal order={order} couriers={couriers} defaults={defaults} onClose={() => setBooking(false)} onBooked={() => { setBooking(false); router.refresh(); }} />}
      {linking && <LinkModal order={order} onClose={() => setLinking(false)} onLinked={() => { setLinking(false); router.refresh(); }} />}
    </>
  );
}

function BookModal({ order, couriers, defaults, onClose, onBooked }: { order: Order; couriers: CourierOption[]; defaults: { courier: string; weightKg: number }; onClose: () => void; onBooked: () => void }) {
  const first = couriers.find((c) => c.id === defaults.courier) ?? couriers[0]!;
  const [courier, setCourier] = useState(first.id);
  const [name, setName] = useState(order.customer.name);
  const [phone, setPhone] = useState(order.customer.phone);
  const [address, setAddress] = useState(order.customer.address.replace(/\s+/g, " ").trim());
  const [cod, setCod] = useState(String(paymentIsCash(order.payment) ? order.total : 0));
  const [weight, setWeight] = useState(String(defaults.weightKg));
  const [note, setNote] = useState(order.customer.note);
  const [place, setPlace] = useState<{ cityId?: number; zoneId?: number; areaId?: number }>({});
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const option = couriers.find((c) => c.id === courier)!;
  const addressId = useId();
  const items = order.items.map((i) => `${i.name} ${i.unit} × ${i.qty}`).join(", ");

  const submit = () =>
    start(async () => {
      setError("");
      const r = await bookParcel({ orderId: order.id, courier, name, phone, address, cod: Number(cod), weightKg: Number(weight), note, ...(option.places ? place : {}) });
      if (!r.ok) return setError(r.error);
      toast.success(`Booked with ${COURIER_NAME[courier].en}`);
      onBooked();
    });

  return (
    <Modal
      open
      // While the courier is booking it, closing would invite a second booking.
      onOpenChange={(o) => !o && !busy && onClose()}
      dismissible={!busy}
      title={`Book #${order.no}`}
      description={items}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Book with {COURIER_NAME[courier].en}</Button></>}
    >
      <div className="flex flex-col gap-4">
        {couriers.length > 1 && (
          <FormField label="Courier" htmlFor="book-courier">
            <select id="book-courier" value={courier} onChange={(e) => { setCourier(e.target.value as CourierId); setPlace({}); }} className="field">
              {couriers.map((c) => <option key={c.id} value={c.id}>{COURIER_NAME[c.id].en}</option>)}
            </select>
          </FormField>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Customer" value={name} onChange={setName} />
          <Input label="Phone" type="tel" inputMode="tel" value={phone} onChange={setPhone} />
        </div>
        <FormField label="Address" htmlFor={addressId} hint={`${address.length}/220. Couriers cut longer addresses.`} error={address.length > 220 ? "Shorten the address to 220 characters." : undefined}>
          <textarea id={addressId} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="field" />
        </FormField>
        {option.places && <PlacePicker key={courier} courier={courier} address={address} required={option.placeRequired} value={place} onChange={setPlace} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Collect (৳)" inputMode="numeric" value={cod} onChange={(v) => setCod(v.replace(/[^\d]/g, ""))} hint={paymentIsCash(order.payment) ? "The order total, cash on delivery." : "Paid already, so nothing to collect."} />
          <Input label="Weight (kg)" type="number" inputMode="decimal" value={weight} onChange={setWeight} hint={courier === "pathao" ? "0.5 to 10 kg." : undefined} />
        </div>
        <Input label="Note for the rider" value={note} onChange={setNote} placeholder="e.g. Call before delivery" />
        {error && <Callout tone="error">{error}</Callout>}
      </div>
    </Modal>
  );
}

/** The courier's city → zone → area lists. CarryBee guesses the city and zone from the address to start with. */
function PlacePicker({ courier, address, required, value, onChange }: { courier: CourierId; address: string; required: boolean; value: { cityId?: number; zoneId?: number; areaId?: number }; onChange: (value: { cityId?: number; zoneId?: number; areaId?: number }) => void }) {
  const [cities, setCities] = useState<Place[] | null>(null);
  const [zones, setZones] = useState<Place[] | null>(null);
  const [areas, setAreas] = useState<Place[] | null>(null);
  const [error, setError] = useState("");
  const [guessing, setGuessing] = useState(required);
  // Guessed once per courier (the picker is keyed by it): later address edits don't override what the admin picked.
  const start = useRef({ address, onChange });

  useEffect(() => {
    let alive = true;
    courierPlaces(courier).then((r) => alive && (r.ok ? setCities(r.places) : setError(r.error)));
    if (required) {
      guessPlace(courier, start.current.address)
        .then((g) => alive && g && start.current.onChange({ cityId: g.cityId, zoneId: g.zoneId }))
        .finally(() => alive && setGuessing(false));
    }
    return () => { alive = false; };
  }, [courier, required]);

  useEffect(() => {
    let alive = true;
    setZones(null);
    if (value.cityId) courierPlaces(courier, value.cityId).then((r) => alive && (r.ok ? setZones(r.places) : setError(r.error)));
    return () => { alive = false; };
  }, [courier, value.cityId]);

  useEffect(() => {
    let alive = true;
    setAreas(null);
    if (value.cityId && value.zoneId) courierPlaces(courier, value.cityId, value.zoneId).then((r) => alive && (r.ok ? setAreas(r.places) : setError(r.error)));
    return () => { alive = false; };
  }, [courier, value.cityId, value.zoneId]);

  const select = (label: string, list: Place[] | null, current: number | undefined, pick: (id: number | undefined) => void, empty: string, disabled = false) => (
    <FormField label={label}>
      <select aria-label={label} value={current ?? ""} disabled={disabled || !list} onChange={(e) => pick(e.target.value ? Number(e.target.value) : undefined)} className="field">
        <option value="">{list ? empty : "Loading…"}</option>
        {list?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </FormField>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-3">
        {select("City", cities, value.cityId, (cityId) => onChange({ cityId }), required ? "Pick a city" : "From the address")}
        {select("Zone", zones, value.zoneId, (zoneId) => onChange({ ...value, zoneId, areaId: undefined }), value.cityId ? "Pick a zone" : "—", !value.cityId)}
        {select("Area", areas, value.areaId, (areaId) => onChange({ ...value, areaId }), "Optional", !value.zoneId)}
      </div>
      <p className="text-caption text-fg-tertiary">
        {guessing ? "Reading the address…" : required ? `${COURIER_NAME[courier].en} needs the city and zone. Check its guess from the address.` : `Leave the city empty and ${COURIER_NAME[courier].en} reads it from the address; pick one if it can't.`}
      </p>
      {error && <p className="text-caption text-fg-error">{error}</p>}
    </div>
  );
}

function LinkModal({ order, onClose, onLinked }: { order: Order; onClose: () => void; onLinked: () => void }) {
  const [courier, setCourier] = useState<CourierId>("steadfast");
  const [consignmentId, setConsignmentId] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const submit = () =>
    start(async () => {
      setError("");
      const r = await linkParcel({ orderId: order.id, courier, consignmentId, trackingCode });
      if (!r.ok) return setError(r.error);
      toast.success("Tracking added");
      onLinked();
    });
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add tracking by hand"
      description="For a parcel booked in the courier's own panel. If that courier is connected, its status updates here."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Add</Button></>}
    >
      <div className="flex flex-col gap-4">
        <FormField label="Courier" htmlFor="link-courier">
          <select id="link-courier" value={courier} onChange={(e) => setCourier(e.target.value as CourierId)} className="field">
            {COURIERS.map((c) => <option key={c} value={c}>{COURIER_NAME[c].en}</option>)}
          </select>
        </FormField>
        <Input label="Consignment ID" value={consignmentId} onChange={setConsignmentId} autoFocus />
        {courier === "steadfast" && <Input label="Tracking code (optional)" value={trackingCode} onChange={setTrackingCode} />}
        {error && <Callout tone="error">{error}</Callout>}
      </div>
    </Modal>
  );
}
