"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "./cart-provider";
import { BagIcon } from "./icons";

/** The header's bag with the number of items: opens the cart drawer, or is a plain link on the order form itself. */
export function CartButton({ href, label }: { href: string; label: string }) {
  const { count, openDrawer } = useCart();
  const onOrderForm = usePathname() === href;
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (onOrderForm || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openDrawer();
      }}
      aria-haspopup={onOrderForm ? undefined : "dialog"}
      className="relative grid size-12 place-items-center rounded-full transition-colors hover:bg-muted hover:text-fg-brand" aria-label={label}>
      <BagIcon className="size-6.5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-caption text-fg-inverse">
          {count}
        </span>
      )}
    </Link>
  );
}
