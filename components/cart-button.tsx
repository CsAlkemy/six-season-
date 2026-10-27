"use client";

import Link from "next/link";

import { useCart } from "./cart-provider";
import { BagIcon } from "./icons";

export function CartButton({ href, label }: { href: string; label: string }) {
  const { count } = useCart();
  return (
    <Link href={href} className="relative grid size-12 place-items-center rounded-full transition-colors hover:bg-muted hover:text-fg-brand" aria-label={label}>
      <BagIcon className="size-6.5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-caption text-fg-inverse">
          {count}
        </span>
      )}
    </Link>
  );
}
