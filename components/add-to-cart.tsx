"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCart } from "./cart-provider";
import { CheckIcon, MinusIcon, PlusIcon } from "./icons";

/** Adds to the cart and flips the button to "Added" for a moment. */
function useAdd() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const addNow = (id: string, variant: string | undefined, qty = 1) => {
    add(id, variant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };
  return { added, addNow, add };
}

interface ActionsProps {
  id: string;
  variant: string | undefined;
  cartHref: string;
  label: string;
  addedLabel: string;
  buyLabel: string;
  /** Product page: a quantity stepper ahead of the buttons. */
  qty?: number;
}

/** Add to cart in outline and Buy now filled, which adds it and goes straight to checkout. */
export function CardActions({ id, variant, cartHref, label, addedLabel, buyLabel, qty = 1 }: ActionsProps) {
  const router = useRouter();
  const { added, addNow, add } = useAdd();

  // Side by side when the card has room (a container query on the card body), stacked in narrow columns.
  return (
    <div className="grid gap-2 @[14rem]:grid-cols-2">
      <button
        type="button"
        onClick={() => addNow(id, variant, qty)}
        className="btn h-12 border border-fg-primary px-3 text-label-md text-fg-primary hover:bg-surface sm:px-3"
      >
        {added ? <CheckIcon className="size-4.5" /> : null}
        {added ? addedLabel : label}
      </button>
      <button
        type="button"
        onClick={() => {
          add(id, variant, qty);
          router.push(cartHref);
        }}
        className="btn-primary h-12 px-3 text-label-md sm:px-3"
      >
        {buyLabel}
      </button>
    </div>
  );
}

/**
 * `max` is what's on the shelf (never more than 20 a line). The big one fills the row on a phone with the − and +
 * at the edges and the number between, and every button is at least 44px to tap there; `small` is the cart line's.
 */
export function QtyStepper({ value, onChange, small, max = 20 }: { value: number; onChange: (n: number) => void; small?: boolean; max?: number }) {
  // Product page: 46px plus the 1px border each side lines up with the 48px pills beside it.
  const size = small ? "size-11 sm:size-8" : "size-11.5";
  const min = small ? 0 : 1;
  const button = `${size} grid shrink-0 touch-manipulation select-none place-items-center rounded-full transition-colors hover:bg-muted active:bg-muted disabled:opacity-30 disabled:hover:bg-transparent disabled:active:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`;
  return (
    <div className={`items-center rounded-full border border-border-strong bg-surface ${small ? "inline-flex" : "flex w-full sm:inline-flex sm:w-auto"}`}>
      <button type="button" className={button} disabled={value <= min && !small} onClick={() => onChange(Math.max(min, value - 1))} aria-label="−">
        <MinusIcon />
      </button>
      <span className={`text-center font-display font-semibold tabular-nums ${small ? "min-w-7" : "min-w-7 flex-1 sm:flex-none"}`} aria-live="polite">{value}</span>
      <button type="button" className={button} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label="+">
        <PlusIcon />
      </button>
    </div>
  );
}
