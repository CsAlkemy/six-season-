"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { placeOrder, type OrderInput } from "@/app/[lang]/cart/actions";
import { PAYMENT_LABEL, t, taka } from "@/lib/i18n";
import { deliveryFee, methodAvailable } from "@/lib/pricing";
import type { Lang, PaymentMethodId, Product, Settings } from "@/lib/types";

import { QtyStepper } from "./add-to-cart";
import { useCart } from "./cart-provider";
import { CheckIcon, TrashIcon } from "./icons";
import { ProductMedia } from "./product-media";

interface Props {
  lang: Lang;
  products: Product[];
  delivery: Settings["delivery"];
  methods: Settings["payments"]["methods"];
}

export function Checkout({ lang, products, delivery, methods }: Props) {
  const d = t(lang);
  const cart = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState("");

  const zones = delivery.zones.filter((z) => z.active);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [method, setMethod] = useState<PaymentMethodId>("cod");

  const lines = cart.lines.flatMap((line) => {
    const product = products.find((p) => p.id === line.id && p.active);
    return product ? [{ product, qty: line.qty }] : [];
  });
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const zone = zones.find((z) => z.id === zoneId);
  const fee = zone ? deliveryFee(zone, subtotal) : 0;
  const total = subtotal + fee;
  const available = methods.filter((m) => methodAvailable(m, total));
  const selected = available.find((m) => m.id === method) ?? available[0];

  if (placed) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-sage-soft text-fg-sage">
          <CheckIcon className="size-7" />
        </div>
        <h1 className="text-h3">{d.orderPlaced}</h1>
        <p className="mt-2 text-fg-secondary">{d.orderPlacedBody}</p>
        <p className="mt-3 text-h4 tracking-wide text-fg-brand">{placed}</p>
        <Link href={`/${lang}`} className="btn-secondary mt-6">
          {d.continueShopping}
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-body-lg text-fg-secondary">{d.emptyCart}</p>
        <Link href={`/${lang}#products`} className="btn-primary mt-6">
          {d.continueShopping}
        </Link>
      </div>
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: OrderInput = {
      lang,
      lines: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
      note: String(form.get("note") ?? ""),
      zoneId,
      method: selected?.id ?? "cod",
      trxId: String(form.get("trxId") ?? ""),
      website: String(form.get("website") ?? ""),
    };
    setError("");
    startTransition(async () => {
      const result = await placeOrder(input).catch(() => null);
      if (result?.ok) {
        cart.clear();
        setPlaced(result.no);
        window.scrollTo({ top: 0 });
      } else {
        setError(result?.error === "phone" ? d.errPhone : result?.error === "required" ? d.errRequired : d.errGeneric);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <section className="card divide-y divide-border">
          {lines.map(({ product, qty }) => (
            <div key={product.id} className="flex items-center gap-4 p-4">
              <ProductMedia product={product} lang={lang} className="size-16! shrink-0 rounded-md [&_svg]:size-6 [&_span]:hidden" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{product.name[lang]}</p>
                <p className="text-body-sm text-fg-secondary">
                  {product.unit[lang]} · {taka(product.price, lang)}
                </p>
              </div>
              <QtyStepper small value={qty} onChange={(n) => cart.setQty(product.id, n)} />
              <button type="button" onClick={() => cart.setQty(product.id, 0)} className="grid size-8 place-items-center rounded-full text-fg-tertiary hover:bg-error-soft hover:text-fg-error" aria-label="Remove">
                <TrashIcon />
              </button>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-4 text-h4">{d.yourDetails}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">{d.name}</label>
              <input id="name" name="name" required maxLength={80} autoComplete="name" className="field" />
            </div>
            <div>
              <label htmlFor="phone" className="label">{d.phone}</label>
              <input id="phone" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="label">{d.address}</label>
              <textarea id="address" name="address" required rows={2} maxLength={400} autoComplete="street-address" className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="note" className="label">{d.note}</label>
              <input id="note" name="note" maxLength={300} className="field" />
            </div>
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-h4">{d.deliveryArea}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {zones.map((z) => (
              <Choice key={z.id} name="zone" checked={zoneId === z.id} onChange={() => setZoneId(z.id)}>
                <span className="font-semibold">{z.name[lang]}</span>
                <span className="text-body-sm text-fg-secondary">
                  {taka(z.fee, lang)} · {z.time[lang]}
                  {z.freeAbove > 0 && ` · ${lang === "bn" ? `${taka(z.freeAbove, lang)} ${d.freeAbove}` : `${d.freeAbove} ${taka(z.freeAbove, lang)}`}`}
                </span>
              </Choice>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-h4">{d.payment}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((m) => (
              <Choice key={m.id} name="method" checked={selected?.id === m.id} onChange={() => setMethod(m.id)}>
                <span className="font-semibold">{PAYMENT_LABEL[m.id][lang]}</span>
                <span className="text-body-sm text-fg-secondary">{m.instructions[lang]}</span>
              </Choice>
            ))}
          </div>
          {selected && selected.id !== "cod" && (
            <div className="mt-4 rounded-lg bg-subtle p-4">
              <p className="text-body-sm">
                {d.sendTo} <strong>{taka(total, lang)}</strong> → <strong className="tabular-nums">{selected.account}</strong>
                {selected.accountType && ` (${selected.accountType})`}
              </p>
              <label htmlFor="trxId" className="label mt-3">{d.trxId}</label>
              <input id="trxId" name="trxId" required maxLength={40} className="field uppercase" />
            </div>
          )}
        </section>
      </div>

      <aside className="card space-y-3 p-6 lg:sticky lg:top-24">
        <Row label={d.subtotal} value={taka(subtotal, lang)} />
        <Row label={d.delivery} value={fee === 0 && zone ? d.free : taka(fee, lang)} />
        <div className="border-t border-border pt-3">
          <Row label={d.total} value={taka(total, lang)} strong />
        </div>
        {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
        <button type="submit" disabled={pending || !selected || !zone} className="btn-primary w-full">
          {pending ? d.placing : d.placeOrder}
        </button>
      </aside>
    </form>
  );
}

function Choice({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition ${checked ? "border-brand bg-brand-soft/40 ring-1 ring-brand" : "border-border-strong hover:border-border-brand"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 accent-(--bg-brand)" />
      <span className="flex flex-col gap-0.5">{children}</span>
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-h4" : "text-fg-secondary"}`}>
      <span>{label}</span>
      <span className={strong ? "" : "font-semibold text-fg-primary"}>{value}</span>
    </div>
  );
}
