"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { advanceOrder, cancelOrder, saveOrderNote } from "@/app/admin/actions";
import { taka } from "@/lib/i18n";
import { paymentIsCash, paymentName } from "@/lib/payments";
import { canCancel, dhakaTime, itemCount, NEXT_STEP } from "@/lib/orders";
import type { Order } from "@/lib/types";

import { Modal, toast } from "./controls";
import { Button, ContentCard } from "./ui";

/** The header's two buttons: print the packing slip, and move the order one step on. */
export function OrderHeaderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const next = NEXT_STEP[order.status];
  return (
    <>
      <Button variant="outline" onClick={() => window.print()}>Print packing slip</Button>
      {next && (
        <Button
          loading={busy}
          onClick={() =>
            start(async () => {
              const r = await advanceOrder(order.id, order.status);
              if (r.ok) toast.success(`#${order.no}: ${next.label.toLowerCase()} done`);
              else toast.error(r.error);
              router.refresh();
            })
          }
        >
          {next.label}
        </Button>
      )}
    </>
  );
}

/** "Order actions": cancel, and when it can't be, a line saying why. Cancelling asks first, in a modal. */
export function OrderActionsCard({ order }: { order: Order }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();
  const allowed = canCancel(order.status);
  const items = itemCount(order);
  const prepaid = !paymentIsCash(order.payment) && order.status !== "new";

  return (
    <>
      <ContentCard title="Order actions">
        <div className="flex flex-col gap-1.5">
          <Button variant="outline" className="w-full" disabled={!allowed} onClick={() => setOpen(true)}>Cancel order</Button>
          {!allowed && <p className="text-center text-caption text-fg-tertiary">{order.status === "cancelled" ? "Already cancelled." : "It has left the warehouse, so it can't be cancelled."}</p>}
        </div>
      </ContentCard>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Cancel order #${order.no}?`}
        description="It won't be packed or shipped."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Keep order</Button>
            <Button
              loading={busy}
              onClick={() =>
                start(async () => {
                  const r = await cancelOrder(order.id, reason);
                  if (r.ok) {
                    setOpen(false);
                    toast.success(`Order #${order.no} cancelled`);
                  } else toast.error(r.error);
                  router.refresh();
                })
              }
            >
              Cancel order
            </Button>
          </>
        }
      >
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body-sm text-fg-secondary">
          {order.stockTaken && <li>Its {items} {items === 1 ? "item goes" : "items go"} back on the shelf.</li>}
          {prepaid && <li>{taka(order.total, "en")} came in by {paymentName(order.payment, "en")}. Refund the customer yourself, outside this panel.</li>}
          <li>The customer sees the order as cancelled in their account.</li>
        </ul>
        <div className="grid gap-2">
          <label htmlFor="cancel-reason" className="text-label-md">Reason (optional)</label>
          <input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer asked to cancel" className="field" />
        </div>
      </Modal>
    </>
  );
}

/** The team's private note on the order. */
export function OrderNoteCard({ id, note }: { id: string; note: string }) {
  const router = useRouter();
  const [text, setText] = useState(note);
  const [busy, start] = useTransition();
  return (
    <ContentCard title="Internal note">
      <textarea aria-label="Internal note" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Only your team sees this" className="field" />
      <Button variant="secondary" className="w-full" loading={busy} disabled={text.trim() === note} onClick={() => start(async () => {
        const r = await saveOrderNote(id, text);
        if (r.ok) toast.success("Note saved");
        else toast.error(r.error);
        router.refresh();
      })}>Save note</Button>
    </ContentCard>
  );
}

/** The packing slip: portalled into <body>, hidden on screen, and the only thing a print shows. */
export function PackingSlip({ order }: { order: Order }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setRoot(document.body), []);
  if (!root) return null;
  return createPortal(
    <div data-print-root className="hidden bg-white p-10 text-black print:block">
      <div className="flex items-start justify-between border-b border-black pb-4">
        <div><p className="text-h4">Matir Taan</p><p>Packing slip</p></div>
        <div className="text-right"><p className="text-h4">#{order.no}</p><p>{dhakaTime(order.createdAt)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-6 py-4">
        <div><p className="font-bold">Deliver to</p><p>{order.customer.name}</p><p>{order.customer.phone}</p><p className="whitespace-pre-line">{order.customer.address}</p><p>{order.zone.name}</p></div>
        <div className="text-right"><p className="font-bold">Collect</p><p className="text-h4">{paymentIsCash(order.payment) ? taka(order.total, "en") : "Paid"}</p><p>{paymentName(order.payment, "en")}</p></div>
      </div>
      <table className="w-full border-t border-black text-left">
        <thead><tr><th className="py-2">Item</th><th>Size</th><th className="text-right">Qty</th></tr></thead>
        <tbody>{order.items.map((item, i) => <tr key={i} className="border-t border-gray-300"><td className="py-2">☐ {item.name}</td><td>{item.unit}</td><td className="text-right">{item.qty}</td></tr>)}</tbody>
      </table>
      {order.customer.note && <p className="mt-4 border border-black p-2">Customer note: {order.customer.note}</p>}
    </div>,
    root,
  );
}
