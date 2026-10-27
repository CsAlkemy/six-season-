import type { Lang, PaymentMethodId, Text } from "./types";

const dict = {
  bn: {
    tagline: "মাটির টানে, খাঁটি খাবার",
    about: "নিজেদের খামার আর চেনা কৃষকদের কাছ থেকে আনা ঘি, সরিষার তেল, গুড় আর দেশি ডিম। কোনো ভেজাল নেই, কোনো মধ্যস্বত্বভোগী নেই।",
    ourProducts: "আমাদের পণ্য",
    productsLead: "অল্প কিছু পণ্য, কিন্তু প্রতিটি যত্ন করে বাছাই করা।",
    addToCart: "কার্টে যোগ করুন",
    buyNow: "এখনই কিনুন",
    /** Cards fit two buttons side by side, so Bangla gets the shorter verb there. */
    addShort: "কার্টে রাখুন",
    added: "যোগ হয়েছে",
    outOfStock: "স্টকে নেই",
    cart: "কার্ট",
    emptyCart: "আপনার কার্ট খালি।",
    continueShopping: "কেনাকাটা চালিয়ে যান",
    checkout: "অর্ডার করুন",
    yourDetails: "আপনার তথ্য",
    name: "নাম",
    phone: "মোবাইল নম্বর",
    address: "পূর্ণ ঠিকানা",
    note: "বিশেষ নির্দেশনা (ঐচ্ছিক)",
    deliveryArea: "ডেলিভারি এলাকা",
    payment: "পেমেন্ট",
    trxId: "ট্রানজেকশন আইডি",
    sendTo: "পাঠান",
    subtotal: "সাবটোটাল",
    delivery: "ডেলিভারি চার্জ",
    free: "ফ্রি",
    total: "সর্বমোট",
    placeOrder: "অর্ডার কনফার্ম করুন",
    placing: "অর্ডার হচ্ছে…",
    freeAbove: "এর বেশি অর্ডারে ফ্রি",
    orderPlaced: "অর্ডার সম্পন্ন হয়েছে!",
    orderPlacedBody: "আমরা শীঘ্রই ফোন করে অর্ডার নিশ্চিত করব। আপনার অর্ডার নম্বর:",
    upTo: "পর্যন্ত",
    contact: "যোগাযোগ",
    whatsapp: "হোয়াটসঅ্যাপে মেসেজ দিন",
    rights: "সর্বস্বত্ব সংরক্ষিত",
    errPhone: "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)",
    errRequired: "এই ঘরটি পূরণ করুন",
    errGeneric: "অর্ডার করা যায়নি। আবার চেষ্টা করুন বা আমাদের ফোন করুন।",
  },
  en: {
    tagline: "Pure food, from the soil",
    about: "Ghee, mustard oil, jaggery and deshi eggs from our own farm and farmers we know by name. No adulteration, no middlemen.",
    ourProducts: "Our products",
    productsLead: "Only a few products, each one chosen with care.",
    addToCart: "Add to cart",
    buyNow: "Buy now",
    addShort: "Add to cart",
    added: "Added",
    outOfStock: "Out of stock",
    cart: "Cart",
    emptyCart: "Your cart is empty.",
    continueShopping: "Continue shopping",
    checkout: "Checkout",
    yourDetails: "Your details",
    name: "Name",
    phone: "Mobile number",
    address: "Full address",
    note: "Delivery note (optional)",
    deliveryArea: "Delivery area",
    payment: "Payment",
    trxId: "Transaction ID",
    sendTo: "Send to",
    subtotal: "Subtotal",
    delivery: "Delivery",
    free: "Free",
    total: "Total",
    placeOrder: "Place order",
    placing: "Placing order…",
    freeAbove: "free above",
    orderPlaced: "Order placed!",
    orderPlacedBody: "We'll call you shortly to confirm. Your order number:",
    upTo: "up to",
    contact: "Contact",
    whatsapp: "Message us on WhatsApp",
    rights: "All rights reserved",
    errPhone: "Enter a valid mobile number (01XXXXXXXXX)",
    errRequired: "Please fill this in",
    errGeneric: "Couldn't place the order. Try again or call us.",
  },
} satisfies Record<Lang, Record<string, string>>;

export type Dict = (typeof dict)["en"];
export const t = (lang: Lang): Dict => dict[lang];

export const STORE_NAME: Text = { bn: "মাটির টান", en: "Matir Taan" };

export const PAYMENT_LABEL: Record<PaymentMethodId, Text> = {
  cod: { bn: "ক্যাশ অন ডেলিভারি", en: "Cash on delivery" },
  bkash: { bn: "বিকাশ", en: "bKash" },
  nagad: { bn: "নগদ", en: "Nagad" },
};

/** ৳১,২৫০ in Bangla, ৳1,250 in English. */
export function taka(amount: number, lang: Lang): string {
  return `৳${new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-IN").format(amount)}`;
}

export const otherLang = (lang: Lang): Lang => (lang === "bn" ? "en" : "bn");
