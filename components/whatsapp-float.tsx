"use client";

import { usePathname } from "next/navigation";

import { waNumber } from "@/lib/site";

import { WhatsAppIcon } from "./icons";

/**
 * A WhatsApp button in the corner of the store, for a question before ordering. From a product page the message
 * starts with that page's link, so the store knows which product it's about. Not on the order form, where it would
 * sit over the fields. A plain link: no chat widget or third-party script.
 */
export function WhatsAppFloat({ number, label }: { number: string; label: string }) {
  const path = usePathname();
  if (!number || path.endsWith("/cart")) return null;
  const base = `https://wa.me/${waNumber(number)}`;
  return (
    <a
      href={base}
      target="_blank"
      rel="noopener"
      aria-label={label}
      onClick={(e) => {
        if (path.includes("/p/")) e.currentTarget.href = `${base}?text=${encodeURIComponent(window.location.href)}`;
      }}
      className="group fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-3 sm:right-6 sm:bottom-6"
    >
      {/* The label shows on hover or keyboard focus, so it doesn't sit over the page the rest of the time. */}
      <span className="rounded-full bg-surface px-4 py-2 text-label-md text-fg-primary opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:hidden">{label}</span>
      <span className="grid size-14 place-items-center rounded-full bg-whatsapp text-fg-on-whatsapp shadow-card transition-transform group-hover:scale-105">
        <WhatsAppIcon className="size-7" />
      </span>
    </a>
  );
}
