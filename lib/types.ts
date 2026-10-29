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
  /** Kept in step with stock wherever stock changes, so the storefront only ever reads this. */
  inStock: boolean;
  /** Units on hand; orders take from it and cancelling puts it back. Missing on older saves (in/out only). */
  stock?: number;
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
  /** The cover photo: images[0], kept separately for older saves and the places that show one. */
  image: string | null;
  /** Up to MAX_PHOTOS photos, cover first. Missing on older saves. */
  images?: string[];
  tone: Tone;
  /** Seasons it's at its best in; the storefront lists it first and badges it then. Missing on older saves. */
  seasons?: Season[];
  /** With sizes, true while any size is in stock. */
  inStock: boolean;
  /** Hidden from the storefront when false. */
  active: boolean;
  /** The admin flags a size as low at or under this many left. */
  lowStockAt?: number;
}

export const MAX_PHOTOS = 6;

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

/** A slug: "cod", "bkash", "nagad" ship with the store; the admin can add more (Rocket, Upay, a bank…). */
export type PaymentMethodId = string;

/** Cash is paid at the door; a wallet or a bank account is paid first and the shopper enters the transaction ID. */
export const PAYMENT_KINDS = ["cash", "wallet", "bank"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export interface PaymentMethod {
  id: PaymentMethodId;
  kind: PaymentKind;
  /** What customers and the team see: "bKash" / "বিকাশ". */
  name: Text;
  enabled: boolean;
  /** Where customers send money: a wallet number, or bank details. Empty for cash. */
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
  home: HomeSettings;
}

/** The storefront's home page: an optional hero, then product sections the admin curates, then everything. */
export interface HomeSettings {
  hero: {
    enabled: boolean;
    title: Text;
    subtitle: Text;
    /** Button text; empty hides the button. It scrolls to the products. */
    cta: Text;
    image: string | null;
  };
  sections: HomeSection[];
}

export interface HomeSection {
  id: string;
  enabled: boolean;
  title: Text;
  subtitle: Text;
  /** In display order; hidden or deleted products are skipped. */
  productIds: string[];
}

export const ORDER_STATUSES = ["new", "confirmed", "packing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** One step in an order's life, for the admin's timeline. */
export interface OrderEvent {
  status: OrderStatus;
  at: string;
  /** The cancel reason. */
  note?: string;
}

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
  /** `name` and `kind` are a snapshot, so the order still reads right after the method is renamed or removed. Missing on older orders. */
  payment: { method: PaymentMethodId; trxId: string; name?: Text; kind?: PaymentKind };
  /** Where the order came from; missing on orders placed through the store. */
  source?: "admin";
  /** Missing on orders placed before the timeline existed. */
  history?: OrderEvent[];
  /** For the team only; the customer never sees it. */
  adminNote?: string;
  /** True once the order's units came off stock, so cancelling knows to put them back. */
  stockTaken?: boolean;
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
