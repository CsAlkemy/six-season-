"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm, type FieldError } from "react-hook-form";

import { requestCode, verifyCode } from "@/app/[lang]/account/actions";
import { placeOrder } from "@/app/[lang]/cart/actions";
import { type Dict, t, taka } from "@/lib/i18n";
import { orderFormSchema, type OrderFormInput, type OrderFormValues } from "@/lib/order-schema";
import { isCash } from "@/lib/payments";
import { deliveryFee, methodAvailable } from "@/lib/pricing";
import type { Lang, Product, Settings } from "@/lib/types";
import { findVariant } from "@/lib/variants";

import { QtyStepper } from "./add-to-cart";
import { useCart } from "./cart-provider";
import { CheckIcon, TrashIcon } from "./icons";
import { OtpField } from "./otp-field";
import { ProductMedia } from "./product-media";

interface Props {
  lang: Lang;
  products: Product[];
  delivery: Settings["delivery"];
  methods: Settings["payments"]["methods"];
  /** The signed-in shopper; their number is already verified, so they skip the OTP. */
  customer: { name: string; phone: string; address: string } | null;
}

export function Checkout({ lang, products, delivery, methods, customer }: Props) {
  const d = t(lang);
  const cart = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ no: string; id: string } | null>(null);
  /** The number a code went to; set while the shopper is typing the code in. */
  const [otpPhone, setOtpPhone] = useState("");
  const [code, setCode] = useState("");

  const zones = delivery.zones.filter((z) => z.active);
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    setError: setFieldError,
    watch,
    formState: { errors },
  } = useForm<OrderFormInput, unknown, OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      note: "",
      zoneId: zones[0]?.id ?? "", method: "cod",
      trxId: "",
      website: "",
    },
  });
  const zoneId = watch("zoneId");
  const method = watch("method");

  // A size the store has since removed drops out, as a hidden product does.
  const found = cart.lines.flatMap((line) => {
    const product = products.find((p) => p.id === line.id && p.active);
    const variant = product && findVariant(product, line.variant);
    return product && variant ? [{ product, variant, line }] : [];
  });
  // Sold-out sizes drop out too, and what's left on the shelf caps each quantity.
  const lines = found.filter((l) => l.variant.inStock).map((l) => ({ ...l, qty: Math.min(l.line.qty, 20, l.variant.stock ?? 20) }));
  const unavailable = cart.lines.length - lines.length;
  const subtotal = lines.reduce((sum, l) => sum + l.variant.price * l.qty, 0);
  const zone = zones.find((z) => z.id === zoneId);
  const fee = zone ? deliveryFee(zone, subtotal) : 0;
  const total = subtotal + fee;
  const available = methods.filter((m) => methodAvailable(m, total));
  const selected = available.find((m) => m.id === method) ?? available[0];

  // A method can drop out as the total changes; keep the form on the one the shopper sees selected.
  useEffect(() => {
    if (selected && selected.id !== method) setValue("method", selected.id);
  }, [selected, method, setValue]);

  if (placed) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-sage-soft text-fg-sage">
          <CheckIcon className="size-7" />
        </div>
        <h1 className="text-h3">{d.orderPlaced}</h1>
        <p className="mt-2 text-fg-secondary">{d.orderPlacedBody}</p>
        <p className="mt-3 text-h4 tracking-wide text-fg-brand">{placed.no}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {placed.id && (
            <Link href={`/${lang}/account?order=${placed.id}`} className="btn-primary">
              {d.trackOrder}
            </Link>
          )}
          <Link href={`/${lang}`} className="btn-secondary">
            {d.continueShopping}
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-body-lg text-fg-secondary">{d.emptyCart}</p>
        {unavailable > 0 && <p className="mt-2 text-body-sm text-soil-700">{d.cartUnavailable}</p>}
        <Link href={`/${lang}#products`} className="btn-primary mt-6">
          {d.continueShopping}
        </Link>
      </div>
    );
  }

  const place = async (values: OrderFormValues) => {
    const result = await placeOrder({ ...values, lang, lines: lines.map((l) => ({ id: l.product.id, variant: l.variant.id, qty: l.qty })) }).catch(() => null);
    if (result?.ok) {
      cart.clear();
      setPlaced({ no: result.no, id: result.id });
      window.scrollTo({ top: 0 });
    } else if (result?.error === "verify") {
      setOtpPhone("");
      setError(d.errVerify);
    } else {
      setError(result?.error === "phone" ? d.errPhone : result?.error === "required" ? d.errRequired : d.errGeneric);
    }
  };

  const sendCode = async (phone: string) => {
    const result = await requestCode(phone, lang).catch(() => null);
    if (result?.ok) {
      setOtpPhone(phone);
      setCode("");
    } else setError(d[result?.error ?? "errSms"]);
  };

  // Guests get a code on the first submit and place the order once it checks out; signed-in shoppers order straight away.
  const onSubmit = (values: OrderFormValues) => {
    setError("");
    // Wallets and banks are paid first, so they need the transaction ID before anything else happens.
    if (selected && !isCash(selected) && !values.trxId) {
      setFieldError("trxId", { type: "required", message: "errRequired" });
      return setFocus("trxId");
    }
    startTransition(async () => {
      if (customer?.phone === values.phone) return place(values);
      if (otpPhone !== values.phone) return sendCode(values.phone);
      if (code.length !== 6) return setError(d.errCode);
      const verified = await verifyCode({ phone: values.phone, code, name: values.name }).catch(() => null);
      if (verified?.ok) await place(values);
      else setError(d[verified?.error ?? "errGeneric"]);
    });
  };
  const verifying = !customer && otpPhone !== "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        {unavailable > 0 && <p className="rounded-md bg-mustard-100 p-4 text-body-sm text-soil-700" role="status">{d.cartUnavailable}</p>}
        <section className="card divide-y divide-border">
          {lines.map(({ product, variant, line, qty }) => (
            <div key={`${product.id}:${variant.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:flex-nowrap">
              <ProductMedia product={product} lang={lang} className="size-16! shrink-0 rounded-md [&_svg]:size-6 [&_span]:hidden" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{product.name[lang]}</p>
                <p className="font-display text-body-md font-medium text-fg-secondary">
                  {variant.label[lang]} · {taka(variant.price, lang)}
                </p>
              </div>
              {/* A phone gets its own row, so the buttons can be a thumb's size without squeezing the name. */}
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start sm:gap-4">
                <QtyStepper small value={qty} max={Math.min(20, variant.stock ?? 20)} onChange={(n) => cart.setQty(line.id, line.variant, n)} />
                <button type="button" onClick={() => cart.setQty(line.id, line.variant, 0)} className="grid size-11 touch-manipulation place-items-center rounded-full text-fg-tertiary hover:bg-error-soft hover:text-fg-error active:bg-error-soft sm:size-8" aria-label="Remove">
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-4 text-h4">{d.yourDetails}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">{d.name}</label>
              <input id="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby="name-error" className="field" {...register("name")} />
              <FieldMessage id="name-error" error={errors.name} d={d} />
            </div>
            <div>
              <label htmlFor="phone" className="label">{d.phone}</label>
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" readOnly={!!customer || verifying} aria-invalid={!!errors.phone} aria-describedby="phone-error" className="field read-only:bg-subtle read-only:text-fg-secondary" {...register("phone")} />
              <FieldMessage id="phone-error" error={errors.phone} d={d} />
              {customer && <p className="mt-1.5 text-body-sm text-fg-tertiary">{d.loggedInAs} · {customer.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="label">{d.address}</label>
              <textarea id="address" rows={2} autoComplete="street-address" aria-invalid={!!errors.address} aria-describedby="address-error" className="field" {...register("address")} />
              <FieldMessage id="address-error" error={errors.address} d={d} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="note" className="label">{d.note}</label>
              <input id="note" aria-invalid={!!errors.note} aria-describedby="note-error" className="field" {...register("note")} />
              <FieldMessage id="note-error" error={errors.note} d={d} />
            </div>
            <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...register("website")} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-h4">{d.deliveryArea}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {zones.map((z) => (
              <Choice key={z.id} name="zone" checked={zoneId === z.id} onChange={() => setValue("zoneId", z.id, { shouldValidate: true })}>
                <span className="font-semibold">{z.name[lang]}</span>
                <span className="font-display text-body-md font-medium text-fg-secondary">
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
              <Choice key={m.id} name="method" checked={selected?.id === m.id} onChange={() => setValue("method", m.id)}>
                <span className="font-semibold">{m.name[lang] || m.name.en}</span>
                <span className="text-body-md text-fg-secondary">{m.instructions[lang]}</span>
              </Choice>
            ))}
          </div>
          {selected && !isCash(selected) && (
            <div className="mt-4 rounded-lg bg-subtle p-4">
              <p className="text-body-md">
                {d.sendTo} <strong>{taka(total, lang)}</strong> → <strong className="tabular-nums">{selected.account}</strong>
                {selected.accountType && ` (${selected.accountType})`}
              </p>
              <label htmlFor="trxId" className="label mt-3">{d.trxId}</label>
              <input id="trxId" aria-invalid={!!errors.trxId} aria-describedby="trxId-error" className="field uppercase" {...register("trxId")} />
              <FieldMessage id="trxId-error" error={errors.trxId} d={d} />
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
        {verifying && (
          <div className="border-t border-border pt-4">
            <OtpField
              d={d}
              phone={otpPhone}
              value={code}
              onChange={setCode}
              disabled={pending}
              onResend={() => startTransition(() => sendCode(otpPhone))}
              onChangeNumber={() => {
                setOtpPhone("");
                setError("");
                setFocus("phone");
              }}
            />
          </div>
        )}
        {!customer && !verifying && <p className="text-body-sm text-fg-tertiary">{d.verifyPhoneHint}</p>}
        {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
        <button type="submit" disabled={pending || !selected || !zone} className="btn-primary w-full">
          {pending ? (customer || verifying ? d.placing : d.sending) : verifying ? d.verifyAndOrder : customer ? d.placeOrder : d.sendCode}
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
      <span className={strong ? "font-display" : "font-display font-semibold text-fg-primary"}>{value}</span>
    </div>
  );
}

/** The schema's message is a dictionary key, so errors read in the page's language. */
function FieldMessage({ id, error, d }: { id: string; error?: FieldError; d: Dict }) {
  if (!error?.message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-body-sm font-medium text-fg-error">
      {d[error.message as keyof Dict] ?? d.errRequired}
    </p>
  );
}
