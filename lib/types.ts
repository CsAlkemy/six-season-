export type Lang = "bn" | "en";
export const LANGS: Lang[] = ["bn", "en"];

/** Copy the storefront shows in both languages. */
export type Text = Record<Lang, string>;

/** Picks the placeholder colour for a product without a photo. */
export type Tone = "butter" | "mustard" | "soil" | "leaf";

/** Bangladesh's six seasons (ষড়ঋতু), in the order the Bangla year runs through them. */
export const SEASONS = ["grishma", "barsha", "sharat", "hemanta", "sheet", "basanta"] as const;
export type Season = (typeof SEASONS)[number];

/** One size of a product, e.g. 500 g at ৳950, with its own price and stock. */
export interface Variant {
  id: string;
  /** "৫০০ গ্রাম" / "500 g". */
  label: Text;
  price: number;
  /** Struck-through "was" price; null hides it. */
  compareAt: number | null;
  inStock: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: Text;
  /** Pack size, e.g. "৫০০ গ্রাম" / "500 g". With sizes, the cheapest one in stock (the admin keeps it in step). */
  unit: Text;
  description: Text;
  /** With sizes, the cheapest one in stock. */
  price: number;
  /** Struck-through "was" price; null hides it. */
  compareAt: number | null;
  /** The sizes on sale; missing on older saves, where unit, price and inStock describe the one size. */
  variants?: Variant[];
  image: string | null;
  tone: Tone;
  /** Seasons it's at its best in; the storefront lists it first and badges it then. Missing on older saves. */
  seasons?: Season[];
  /** With sizes, true while any size is in stock. */
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

export const PAYMENT_METHOD_IDS = ["cod", "bkash", "nagad"] as const;
export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

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
  /** Missing on orders placed before products had sizes. */
  variantId?: string;
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

/** A shopper's account, keyed by their verified mobile number. */
export interface Customer {
  phone: string;
  name: string;
  /** Last delivery address, filled into the next checkout. */
  address: string;
  /** scrypt `salt:hash`; null for shoppers who only ever verified by OTP. */
  password: string | null;
  createdAt: string;
  failedLogins?: number;
  lockedUntil?: number;
}

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** A buyer's review of a product; the store shows it once an admin approves it. */
export interface Review {
  /** Keyed hash of the reviewer's phone: one review per customer per product, and no number in the file. */
  id: string;
  productId: string;
  name: string;
  /** 1–5. */
  rating: number;
  text: string;
  status: ReviewStatus;
  createdAt: string;
  /** The delivered order that made them a buyer, for the admin. */
  orderNo: string;
  /** "017•••••821": enough for the admin to recognise the customer. */
  phoneHint: string;
  reply: { text: string; at: string } | null;
}
