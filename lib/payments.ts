import { PAYMENT_LABEL } from "./i18n";
import type { Lang, Order, PaymentKind, PaymentMethod, Text } from "./types";

/** Cash is settled at the door; wallets and banks are paid first. Methods saved before `kind` existed are told apart by id. */
export const kindOf = (method: Pick<PaymentMethod, "id"> & Partial<Pick<PaymentMethod, "kind">>): PaymentKind => method.kind ?? (method.id === "cod" ? "cash" : "wallet");
export const isCash = (method: Pick<PaymentMethod, "id"> & Partial<Pick<PaymentMethod, "kind">>) => kindOf(method) === "cash";

/** The name an order's payment goes by: the snapshot taken when it was placed, else the store's own name for the id. */
export function paymentName(payment: Order["payment"], lang: Lang): string {
  return payment.name?.[lang] || payment.name?.en || PAYMENT_LABEL[payment.method]?.[lang] || payment.method;
}

export const paymentIsCash = (payment: Order["payment"]) => (payment.kind ? payment.kind === "cash" : payment.method === "cod");

/** What the "+ Add method" picker offers. Brand colours tint the tile; nothing here is a logo. */
export interface PaymentPreset {
  id: string;
  kind: PaymentKind;
  name: Text;
  hint: string;
  /** Tile colours: background, text. */
  tile: [string, string];
  accountType: string;
  instructions: Text;
}

const SEND: Text = { bn: "নিচের নম্বরে Send Money করুন, তারপর ট্রানজেকশন আইডি দিন।", en: "Send Money to the number below, then enter the transaction ID." };

export const PAYMENT_PRESETS: PaymentPreset[] = [
  { id: "bkash", kind: "wallet", name: { bn: "বিকাশ", en: "bKash" }, hint: "Mobile wallet · Send Money", tile: ["#fde7ef", "#c4175b"], accountType: "Personal", instructions: SEND },
  { id: "nagad", kind: "wallet", name: { bn: "নগদ", en: "Nagad" }, hint: "Mobile wallet · Send Money", tile: ["#fdebdc", "#d4531a"], accountType: "Personal", instructions: SEND },
  { id: "rocket", kind: "wallet", name: { bn: "রকেট", en: "Rocket" }, hint: "Mobile wallet · Dutch-Bangla", tile: ["#efe6f7", "#7a2e9e"], accountType: "Personal", instructions: SEND },
  { id: "upay", kind: "wallet", name: { bn: "উপায়", en: "Upay" }, hint: "Mobile wallet · UCB", tile: ["#e3eefb", "#1f5fb0"], accountType: "Personal", instructions: SEND },
  {
    id: "bank",
    kind: "bank",
    name: { bn: "ব্যাংক ট্রান্সফার", en: "Bank transfer" },
    hint: "Account number and bank details",
    tile: ["#e8eef0", "#3d5662"],
    accountType: "",
    instructions: { bn: "নিচের ব্যাংক অ্যাকাউন্টে টাকা পাঠান, তারপর ট্রানজেকশন আইডি বা রেফারেন্স দিন।", en: "Transfer to the bank account below, then enter the transaction ID or reference." },
  },
  {
    id: "custom",
    kind: "wallet",
    name: { bn: "", en: "" },
    hint: "Any other wallet, name it yourself",
    tile: ["#eef1ea", "#4e5c3a"],
    accountType: "",
    instructions: SEND,
  },
];

/** The tile colours for a method: its preset's, else a neutral green. Cash gets its own. */
export function tileFor(method: Pick<PaymentMethod, "id" | "kind">): [string, string] {
  if (method.kind === "cash") return ["#f1e9e0", "#6e4a35"];
  return PAYMENT_PRESETS.find((p) => p.id === method.id)?.tile ?? (method.kind === "bank" ? PAYMENT_PRESETS[4]!.tile : PAYMENT_PRESETS[5]!.tile);
}
