import type { CourierId, ShipmentStage } from "../types";
import { COURIER_NAME, type Place } from "./meta";

/** What the store asks a courier to deliver, already checked and in its final form. */
export interface Parcel {
  /** Unique per parcel: the order number, plus "-2"… for a re-booking. */
  invoice: string;
  name: string;
  /** 01XXXXXXXXX. */
  phone: string;
  address: string;
  /** Whole taka to collect; 0 when prepaid. */
  cod: number;
  note: string;
  /** "Ghee 500 g × 2, Mustard oil 1 litre × 1". */
  description: string;
  quantity: number;
  weightKg: number;
  /** Pathao and CarryBee's own ids for the delivery address. */
  cityId?: number;
  zoneId?: number;
  areaId?: number;
}

export interface Booked {
  consignmentId: string;
  trackingCode?: string;
  trackingUrl?: string;
  status: string;
  fee?: number;
}

export interface StatusNow {
  status: string;
  stage: ShipmentStage | null;
  fee?: number;
  note?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** A courier's answer: the HTTP status and the JSON body (null if it wasn't JSON). */
export interface Answer {
  status: number;
  body: Record<string, unknown> | null;
}

/**
 * One call to a courier. A timeout or a dropped connection becomes a sentence the admin can act on. After a timeout
 * on a booking nobody knows whether the parcel was made, so the caller says to check the courier's panel first.
 */
export async function call(courier: CourierId, url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Result<Answer>> {
  const name = COURIER_NAME[courier].en;
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
      signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
      cache: "no-store",
    });
    const text = await res.text();
    let body: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = JSON.parse(text);
      body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {}
    return { ok: true, value: { status: res.status, body } };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return fail(`${name} didn't answer in time.`);
    return fail(`Couldn't reach ${name}. Check the internet connection and try again.`);
  }
}

/** The first readable message in a courier's error body: a top-level message, or the first field error. */
export function messageOf(body: Record<string, unknown> | null): string {
  if (!body) return "";
  const errors = (body.errors ?? body.causes) as Record<string, unknown> | undefined;
  if (errors && typeof errors === "object") {
    for (const [field, value] of Object.entries(errors)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === "string") return `${field.replace(/_/g, " ")}: ${first}`;
      if (first && typeof first === "object" && "type" in first) return `${field.replace(/_/g, " ")} is ${String((first as { type: unknown }).type)}`;
    }
  }
  return typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : "";
}

export const num = (value: unknown): number | undefined => {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** `[{ id, name }]` from a courier's list, whatever it calls the fields. */
export function places(list: unknown, id: string, name: string): Place[] {
  return (Array.isArray(list) ? list : [])
    .map((item) => ({ id: num((item as Record<string, unknown>)?.[id]) ?? NaN, name: String((item as Record<string, unknown>)?.[name] ?? "").trim() }))
    .filter((p) => Number.isFinite(p.id) && p.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}
