import { after } from "next/server";

import { type Email, type EmailConfig, esc, layout, loadEmailConfig, rows, section, sendEmail } from "./email";
import { taka } from "./i18n";
import { paymentIsCash, paymentName } from "./payments";
import { absolute } from "./site";
import type { StockAlert } from "./stock";
import type { Order, Review } from "./types";

/**
 * Email alerts for the team: each is built and sent after the response has gone out, so neither a slow mail service
 * nor a missing setup ever holds up or fails a checkout. Which ones go out is set in Admin › Settings › Notifications.
 */
function later(name: string, build: (config: EmailConfig) => Email | null) {
  const run = async () => {
    try {
      const config = await loadEmailConfig();
      if (!config?.apiKey || !config.to.length) return;
      const email = build(config);
      if (email) await sendEmail(config, email);
    } catch (error) {
      console.error(`notify: ${name}`, error);
    }
  };
  try {
    after(run);
  } catch {
    // Outside a request (a script): just send it.
    void run();
  }
}

const adminOrder = (order: Order) => absolute(`/admin/orders/${order.id}`);
const money = (amount: number) => taka(amount, "en");

function stockHtml(alerts: StockAlert[]) {
  return rows(alerts.map((a) => [`${a.product} · ${a.size}`, { html: a.left === 0 ? `<strong style="color:#b42318">Sold out</strong>` : `<strong>${a.left} left</strong>` }]));
}
const stockText = (alerts: StockAlert[]) => alerts.map((a) => `- ${a.product} · ${a.size}: ${a.left === 0 ? "sold out" : `${a.left} left`}`).join("\n");

/** A new order from the store or the team, with any sizes it ran low; or just the stock part if order alerts are off. */
export function notifyNewOrder(order: Order, alerts: StockAlert[]) {
  later("order", (config) => {
    const withStock = config.events.stock && alerts.length > 0;
    if (!config.events.orders) return withStock ? stockEmail(alerts, order) : null;

    const cash = paymentIsCash(order.payment);
    const pay = paymentName(order.payment, "en");
    const team = order.source === "admin";
    const items = order.items.map((item) => [`${item.name} · ${item.unit} × ${item.qty}`, money(item.price * item.qty)] as [string, string]);
    const totals: [string, string][] = [
      ["Subtotal", money(order.subtotal)],
      [`Delivery · ${order.zone.name}`, order.deliveryFee ? money(order.deliveryFee) : "Free"],
      ["Total", money(order.total)],
    ];
    const subject = `${team ? "Phone order" : "New order"} #${order.no} · ${money(order.total)} · ${pay}${!cash && order.payment.trxId ? " · check TrxID" : ""}`;

    const html = layout({
      title: `${team ? "Order created by the team" : "New order"} #${order.no}`,
      intro: `${money(order.total)} · ${pay} · ${order.zone.name}${order.status === "new" ? " · waiting for you to confirm it" : ""}`,
      body: [
        rows([
          ["Customer", order.customer.name],
          ["Phone", { html: `<a href="tel:${esc(order.customer.phone)}" style="color:#2b2118">${esc(order.customer.phone)}</a>` }],
          ["Address", order.customer.address],
          ["Note", order.customer.note],
          ["Payment", cash ? `${pay}: collect ${money(order.total)}` : `${pay}${order.payment.trxId ? ` · TrxID ${order.payment.trxId}` : " · no transaction ID yet"}`],
        ]),
        !cash ? `<p style="margin:10px 0 0;color:#b54708;font-size:13px">Check the money has arrived before you confirm it.</p>` : "",
        section("Items", rows([...items, ...totals])),
        withStock ? section("Stock running low", stockHtml(alerts)) : "",
        order.adminNote ? section("Internal note", `<p style="margin:0">${esc(order.adminNote)}</p>`) : "",
      ].join(""),
      button: { label: "Open the order", href: adminOrder(order) },
    });
    const text = [
      `${team ? "Order created by the team" : "New order"} #${order.no}`,
      `${money(order.total)} · ${pay}${order.payment.trxId ? ` · TrxID ${order.payment.trxId}` : ""}`,
      "",
      `${order.customer.name} · ${order.customer.phone}`,
      order.customer.address,
      order.zone.name,
      order.customer.note && `Note: ${order.customer.note}`,
      "",
      ...items.map(([label, value]) => `${label}: ${value}`),
      ...totals.map(([label, value]) => `${label}: ${value}`),
      withStock ? `\nStock running low:\n${stockText(alerts)}` : "",
      "",
      adminOrder(order),
    ].filter((line) => line !== null && line !== undefined).join("\n");
    return { subject, html, text, idempotencyKey: `order-${order.id}` };
  });
}

function stockEmail(alerts: StockAlert[], order: Order): Email {
  const first = alerts[0]!;
  const subject = alerts.length === 1 ? `${first.left === 0 ? "Sold out" : "Running low"}: ${first.product} ${first.size}${first.left ? ` (${first.left} left)` : ""}` : `${alerts.length} sizes running low`;
  return {
    subject,
    html: layout({ title: "Stock running low", intro: `After order #${order.no}.`, body: stockHtml(alerts), button: { label: "Open products", href: absolute("/admin/products") } }),
    text: `Stock running low after order #${order.no}:\n${stockText(alerts)}\n\n${absolute("/admin/products")}`,
    idempotencyKey: `stock-${order.id}`,
  };
}

/** A buyer's review waiting to be approved. */
export function notifyReview(review: Review, productName: string) {
  later("review", (config) => {
    if (!config.events.reviews) return null;
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    return {
      subject: `New review: ${stars} ${productName}`,
      html: layout({
        title: "New review waiting for approval",
        body: rows([
          ["Product", productName],
          ["Rating", `${stars} (${review.rating}/5)`],
          ["From", `${review.name} · ${review.phoneHint}`],
          ["Order", `#${review.orderNo}`],
          ["Review", review.text],
        ]),
      }),
      text: `New review waiting for approval\n${productName}: ${stars}\nFrom ${review.name} (${review.phoneHint}), order #${review.orderNo}\n\n${review.text}`,
      idempotencyKey: `review-${review.id}-${review.productId}-${review.createdAt}`,
    };
  });
}

/** For the settings page's "Send test email" button. */
export const testEmail = (): Email => ({
  subject: "Test email from Matir Taan",
  html: layout({ title: "Email alerts work", intro: "This is the test from Admin › Settings › Notifications.", body: `<p style="margin:0">New orders and the other alerts you switched on will arrive here.</p>`, button: { label: "Open the admin", href: absolute("/admin") } }),
  text: "Email alerts work. New orders and the other alerts you switched on will arrive here.",
});
