"use client";

import { updateOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

/** Saves as soon as a new status is picked. */
export function StatusSelect({ id, status }: { id: string; status: OrderStatus }) {
  return (
    <form action={updateOrderStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-body-sm font-semibold capitalize"
        aria-label="Order status"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </form>
  );
}
