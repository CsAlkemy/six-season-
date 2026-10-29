import { isAdmin } from "@/lib/auth";
import { loadAllOrders } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/orders";
import { paymentName } from "@/lib/payments";

const cell = (value: string | number) => {
  // A leading = + - @ would run as a formula in Excel; the apostrophe stops it.
  const s = String(value).replace(/^[=+\-@]/, "'$&");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The orders matching the list's filters, as a spreadsheet. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const p = new URL(request.url).searchParams;
  const days = Number(p.get("range")) || 0;
  const q = (p.get("q") ?? "").toLowerCase();
  const nos = p.get("nos")?.split(",").filter(Boolean);
  const orders = (await loadAllOrders()).filter(
    (o) =>
      (!nos || nos.includes(o.no)) &&
      (!p.get("status") || o.status === p.get("status")) &&
      (!p.get("pay") || o.payment.method === p.get("pay")) &&
      (!days || Date.now() - Date.parse(o.createdAt) <= days * 86_400_000) &&
      (!q || [o.no, o.customer.name, o.customer.phone].some((v) => v.toLowerCase().includes(q))),
  );
  const rows = [
    ["Order", "Date", "Status", "Name", "Phone", "Address", "Area", "Items", "Subtotal", "Delivery", "Total", "Payment", "TrxID", "Note"],
    ...orders.map((o) => [
      o.no,
      new Date(o.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
      STATUS_LABEL[o.status],
      o.customer.name,
      o.customer.phone,
      o.customer.address,
      o.zone.name,
      o.items.map((i) => `${i.name} (${i.unit}) x${i.qty}`).join("; "),
      o.subtotal,
      o.deliveryFee,
      o.total,
      paymentName(o.payment, "en"),
      o.payment.trxId,
      o.customer.note,
    ]),
  ];
  return new Response("﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
