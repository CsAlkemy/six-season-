"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCart } from "./cart-provider";
import { CheckIcon, MinusIcon, PlusIcon } from "./icons";

interface Props {
  id: string;
  label: string;
  addedLabel: string;
  /** Product page shows a quantity stepper; cards add one at a time. */
  withQty?: boolean;
  className?: string;
}

export function AddToCart({ id, label, addedLabel, withQty, className = "" }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    add(id, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className={`flex gap-3 ${className}`}>
      {withQty && <QtyStepper value={qty} onChange={setQty} />}
      <button type="button" onClick={onAdd} className="btn-primary flex-1">
        {added ? <CheckIcon /> : null}
        {added ? addedLabel : label}
      </button>
    </div>
  );
}

/** The card's pair: Add to cart in outline, Buy now filled, which adds it and goes straight to checkout. */
export function CardActions({ id, cartHref, label, addedLabel, buyLabel }: { id: string; cartHref: string; label: string; addedLabel: string; buyLabel: string }) {
  const { add } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    add(id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const onBuy = () => {
    add(id, 1);
    router.push(cartHref);
  };

  // Side by side when the card has room (a container query on the card body), stacked in narrow columns.
  return (
    <div className="grid gap-2 @[14rem]:grid-cols-2">
      <button
        type="button"
        onClick={onAdd}
        className="btn h-12 border border-fg-primary px-3 text-label-md text-fg-primary hover:bg-surface sm:px-3"
      >
        {added ? <CheckIcon className="size-4.5" /> : null}
        {added ? addedLabel : label}
      </button>
      <button type="button" onClick={onBuy} className="btn-primary h-12 px-3 text-label-md sm:px-3">
        {buyLabel}
      </button>
    </div>
  );
}

export function QtyStepper({ value, onChange, small }: { value: number; onChange: (n: number) => void; small?: boolean }) {
  // 54px plus the 1px border each side lines up with the 56px pill beside it.
  const size = small ? "size-8" : "size-13.5";
  return (
    <div className="inline-flex items-center rounded-full border border-border-strong">
      <button type="button" className={`${size} grid place-items-center rounded-full hover:bg-muted`} onClick={() => onChange(Math.max(small ? 0 : 1, value - 1))} aria-label="−">
        <MinusIcon />
      </button>
      <span className="min-w-7 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className={`${size} grid place-items-center rounded-full hover:bg-muted`} onClick={() => onChange(Math.min(20, value + 1))} aria-label="+">
        <PlusIcon />
      </button>
    </div>
  );
}
