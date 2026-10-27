export type Lang = "bn" | "en";
export const LANGS: Lang[] = ["bn", "en"];

/** Copy the storefront shows in both languages. */
export type Text = Record<Lang, string>;

/** Picks the placeholder colour for a product without a photo. */
export type Tone = "butter" | "mustard" | "soil" | "leaf";

export interface Product {
  id: string;
  slug: string;
  name: Text;
  /** Pack size, e.g. "৫০০ গ্রাম" / "500 g". */
  unit: Text;
  description: Text;
  price: number;
  /** Struck-through "was" price; null hides it. */
  compareAt: number | null;
  image: string | null;
  tone: Tone;
  inStock: boolean;
  /** Hidden from the storefront when false. */
  active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: Text;
  fee: number;
  /** Orders at or over this ship free; 0 never does. */
  freeAbove: number;
  /** "১–২ দিন" / "1–2 days". */
  time: Text;
  active: boolean;
}

export type PaymentMethodId = "cod" | "bkash" | "nagad";

export interface PaymentMethod {
  id: PaymentMethodId;
  enabled: boolean;
  /** Wallet number customers send money to (bKash / Nagad). */
  account: string;
  /** "Personal", "Merchant"… shown next to the number. */
  accountType: string;
  /** Orders over this can't use the method; 0 means no limit. */
  maxAmount: number;
  instructions: Text;
}

export interface Settings {
  store: {
    phone: string;
    /** Digits only with country code, e.g. 8801XXXXXXXXX. Empty hides the WhatsApp button. */
    whatsapp: string;
    email: string;
    address: Text;
    /** Thin bar above the header; empty hides it. */
    announcement: Text;
  };
  delivery: { zones: DeliveryZone[] };
  payments: { methods: PaymentMethod[] };
}

export const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  qty: number;
}

export interface Order {
  /** Blob key; sorts newest first. */
  id: string;
  /** What the customer and courier see, e.g. MT-261027-4821. */
  no: string;
  createdAt: string;
  status: OrderStatus;
  lang: Lang;
  customer: { name: string; phone: string; address: string; note: string };
  zone: { id: string; name: string };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: { method: PaymentMethodId; trxId: string };
}
