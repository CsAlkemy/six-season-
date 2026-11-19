import { randomBytes } from "node:crypto";

import { absolute } from "../site";
import type { CourierId, Shipment } from "../types";
import { maskSecret, openVault, writeVault } from "../vault";
import * as carrybee from "./carrybee";
import type { Booked, Parcel, Result, StatusNow } from "./http";
import { type CourierDefaults, type CouriersView, type CourierView, type Place } from "./meta";
import * as pathao from "./pathao";
import * as steadfast from "./steadfast";

export type { CarrybeeAccount } from "./carrybee";
export type { PathaoAccount } from "./pathao";
export type { SteadfastAccount } from "./steadfast";

/** Every courier's keys and the booking defaults, kept together in the vault. */
export interface CourierAccounts {
  steadfast?: steadfast.SteadfastAccount;
  pathao?: pathao.PathaoAccount;
  carrybee?: carrybee.CarrybeeAccount;
  defaults: CourierDefaults;
}

const VAULT = "couriers";
export const DEFAULT_WEIGHT_KG = 0.5;
const EMPTY: CourierAccounts = { defaults: { courier: "", weightKg: DEFAULT_WEIGHT_KG } };

export async function openAccounts(): Promise<{ accounts: CourierAccounts; unreadable: boolean }> {
  const { value, unreadable } = await openVault<CourierAccounts>(VAULT);
  return { accounts: { ...EMPTY, ...value, defaults: { ...EMPTY.defaults, ...value?.defaults } }, unreadable };
}
export const loadAccounts = async () => (await openAccounts()).accounts;
export const saveAccounts = (accounts: CourierAccounts) => writeVault(VAULT, accounts);

/** A secret for a courier's webhook: made once, kept across reconnects so the panel's copy stays right. */
export const newSecret = () => randomBytes(24).toString("base64url");

export const webhookUrl = (id: CourierId) => absolute(`/api/couriers/${id}`);

/** The couriers with keys saved, default first. */
export function connected(accounts: CourierAccounts): CourierId[] {
  const ids = (["steadfast", "pathao", "carrybee"] as const).filter((id) => accounts[id]);
  const first = accounts.defaults.courier;
  return first && ids.includes(first) ? [first, ...ids.filter((id) => id !== first)] : ids;
}

/** Couriers with their own city / zone / area lists for the address. */
export const needsPlace = (id: CourierId) => id !== "steadfast";
/** CarryBee can't book without them; Pathao works them out from the address unless the admin picks. */
export const placeRequired = (id: CourierId) => id === "carrybee";

export async function couriersView(): Promise<CouriersView> {
  const { accounts, unreadable } = await openAccounts();
  const view = (id: CourierId, summary: string[], saved: string[], fields: Record<string, string>, secret: string, sandbox = false): CourierView => ({
    id,
    connected: Boolean(accounts[id]),
    unreadable,
    summary,
    sandbox,
    saved,
    fields,
    webhook: { url: webhookUrl(id), secret },
  });
  const s = accounts.steadfast;
  const p = accounts.pathao;
  const c = accounts.carrybee;
  return {
    couriers: [
      view("steadfast", s ? [`API key ${maskSecret(s.apiKey)}`] : [], s ? ["apiKey", "secretKey"] : [], {}, s?.webhookToken ?? ""),
      view("pathao", p ? [`Store: ${p.storeName}`, p.username] : [], p ? ["clientSecret", "password"] : [], p ? { clientId: p.clientId, username: p.username, storeId: p.storeId } : {}, p?.webhookSecret ?? "", p?.sandbox),
      view("carrybee", c ? [`Store: ${c.storeName}`, `Client ID ${maskSecret(c.clientId)}`] : [], c ? ["clientSecret", "clientContext"] : [], c ? { clientId: c.clientId, storeId: c.storeId } : {}, c?.webhookSecret ?? "", c?.sandbox),
    ],
    defaults: accounts.defaults,
  };
}

const missing = (id: CourierId): { ok: false; error: string } => ({ ok: false, error: `Connect ${id === "carrybee" ? "CarryBee" : id === "pathao" ? "Pathao" : "Steadfast"} in Settings › Couriers first.` });

export async function book(accounts: CourierAccounts, id: CourierId, parcel: Parcel): Promise<Result<Booked>> {
  if (id === "steadfast") return accounts.steadfast ? steadfast.book(accounts.steadfast, parcel) : missing(id);
  if (id === "pathao") return accounts.pathao ? pathao.book(accounts.pathao, parcel) : missing(id);
  return accounts.carrybee ? carrybee.book(accounts.carrybee, parcel) : missing(id);
}

export async function status(accounts: CourierAccounts, shipment: Pick<Shipment, "courier" | "consignmentId">): Promise<Result<StatusNow>> {
  const { courier: id, consignmentId } = shipment;
  if (id === "steadfast") return accounts.steadfast ? steadfast.status(accounts.steadfast, consignmentId) : missing(id);
  if (id === "pathao") return accounts.pathao ? pathao.status(accounts.pathao, consignmentId) : missing(id);
  return accounts.carrybee ? carrybee.status(accounts.carrybee, consignmentId) : missing(id);
}

/** Only CarryBee cancels by API; the others are cancelled in their own panel. */
export const canCancelByApi = (id: CourierId) => id === "carrybee";

export async function cancel(accounts: CourierAccounts, shipment: Shipment, reason: string): Promise<Result<null>> {
  if (shipment.courier !== "carrybee") return { ok: false, error: "Cancel this parcel in the courier's own panel." };
  return accounts.carrybee ? carrybee.cancel(accounts.carrybee, shipment.consignmentId, reason) : missing("carrybee");
}

export async function listPlaces(accounts: CourierAccounts, id: CourierId, cityId?: number, zoneId?: number): Promise<Result<Place[]>> {
  if (id === "pathao") return accounts.pathao ? pathao.list(accounts.pathao, cityId, zoneId) : missing(id);
  if (id === "carrybee") return accounts.carrybee ? carrybee.list(accounts.carrybee, cityId, zoneId) : missing(id);
  return { ok: true, value: [] };
}

/** The courier's own guess at the city and zone from the typed address, where it has one (CarryBee). */
export async function detectPlace(accounts: CourierAccounts, id: CourierId, address: string): Promise<{ cityId: number; zoneId: number } | null> {
  if (id !== "carrybee" || !accounts.carrybee) return null;
  const r = await carrybee.detect(accounts.carrybee, address);
  return r.ok ? r.value : null;
}

export { carrybee, pathao, steadfast };
