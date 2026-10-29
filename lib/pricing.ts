import { isCash } from "./payments";
import type { DeliveryZone, PaymentMethod } from "./types";

/** Shared by the checkout preview and the server, which recomputes everything itself. */

export function deliveryFee(zone: DeliveryZone, subtotal: number): number {
  return zone.freeAbove > 0 && subtotal >= zone.freeAbove ? 0 : zone.fee;
}

/** Switched on, set up (wallets and banks need somewhere to send money) and within its order limit. */
export function methodAvailable(method: PaymentMethod, total: number): boolean {
  if (!method.enabled) return false;
  if (!isCash(method) && !method.account.trim()) return false;
  return method.maxAmount === 0 || total <= method.maxAmount;
}

/** 01XXXXXXXXX from "+880 1X…", "8801X…" or "01X…"; null when it isn't a Bangladeshi mobile. */
export function normalizePhone(raw: string): string | null {
  // Bangla keyboards type ০১৭…; read them as 017….
  const latin = raw.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
  const digits = latin.replace(/\D/g, "").replace(/^88(?=01)/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}
