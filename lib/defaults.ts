import type { Product, Settings } from "./types";

/** What the store shows before the admin saves anything. Prices are placeholders; photos are stand-ins (public/images/products/CREDITS.md). */
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "ghee",
    slug: "gawa-ghee",
    name: { bn: "খাঁটি গাওয়া ঘি", en: "Pure Cow Ghee" },
    unit: { bn: "৫০০ গ্রাম", en: "500 g" },
    description: {
      bn: "দেশি গরুর দুধের ননী থেকে ধীরে জ্বাল দিয়ে তৈরি। কোনো ভেজাল বা রং নেই, দানাদার আর সুগন্ধি।",
      en: "Slow-cooked from the cream of local cows' milk. No additives or colour, grainy and fragrant.",
    },
    price: 950,
    compareAt: null,
    image: "/images/products/ghee.jpg",
    tone: "butter",
    inStock: true,
    active: true,
  },
  {
    id: "mustard-oil",
    slug: "mustard-oil",
    name: { bn: "ঘানি ভাঙা সরিষার তেল", en: "Cold-Pressed Mustard Oil" },
    unit: { bn: "১ লিটার", en: "1 litre" },
    description: {
      bn: "কাঠের ঘানিতে ভাঙা খাঁটি সরিষার তেল। ঝাঁঝালো ঘ্রাণ, রান্না ও ভর্তার জন্য সেরা।",
      en: "Pure mustard oil pressed in a wooden ghani. Sharp aroma, perfect for cooking and bhorta.",
    },
    price: 380,
    compareAt: null,
    image: "/images/products/mustard-oil.jpg",
    tone: "mustard",
    // Fresh oil from the winter mustard harvest.
    seasons: ["sheet", "basanta"],
    inStock: true,
    active: true,
  },
  {
    id: "gur",
    slug: "khejur-gur",
    name: { bn: "খেজুরের পাটালি গুড়", en: "Date Palm Jaggery" },
    unit: { bn: "১ কেজি", en: "1 kg" },
    description: {
      bn: "শীতের ভোরে নামানো খেজুর রস জ্বাল দিয়ে তৈরি পাটালি। চিনি মেশানো নেই।",
      en: "Patali made from date palm sap collected on winter mornings. No added sugar.",
    },
    price: 550,
    compareAt: null,
    image: "/images/products/gur.jpg",
    tone: "soil",
    // Khejur rosh runs from late Hemanta through Sheet.
    seasons: ["hemanta", "sheet"],
    inStock: true,
    active: true,
  },
  {
    id: "eggs",
    slug: "deshi-eggs",
    name: { bn: "দেশি মুরগির ডিম", en: "Free-Range Deshi Eggs" },
    unit: { bn: "১২ পিস", en: "12 pcs" },
    description: {
      bn: "খোলা উঠানে চরে বেড়ানো দেশি মুরগির ডিম। গাঢ় কুসুম, প্রতিদিন সংগ্রহ করা।",
      en: "From deshi hens that roam open yards. Deep yolks, collected daily.",
    },
    price: 260,
    compareAt: null,
    image: "/images/products/eggs.jpg",
    tone: "leaf",
    inStock: true,
    active: true,
  },
];

export const DEFAULT_SETTINGS: Settings = {
  store: {
    phone: "",
    whatsapp: "",
    email: "",
    address: { bn: "", en: "" },
    announcement: { bn: "সারা দেশে ক্যাশ অন ডেলিভারি", en: "Cash on delivery across Bangladesh" },
  },
  delivery: {
    zones: [
      {
        id: "dhaka",
        name: { bn: "ঢাকা শহরের ভেতরে", en: "Inside Dhaka" },
        fee: 70,
        freeAbove: 0,
        time: { bn: "১–২ দিন", en: "1–2 days" },
        active: true,
      },
      {
        id: "outside",
        name: { bn: "ঢাকার বাইরে", en: "Outside Dhaka" },
        fee: 130,
        freeAbove: 0,
        time: { bn: "২–৪ দিন", en: "2–4 days" },
        active: true,
      },
    ],
  },
  payments: {
    methods: [
      {
        id: "cod",
        enabled: true,
        account: "",
        accountType: "",
        maxAmount: 10000,
        instructions: { bn: "পণ্য হাতে পেয়ে টাকা দিন।", en: "Pay when you receive your order." },
      },
      {
        id: "bkash",
        enabled: false,
        account: "",
        accountType: "Personal",
        maxAmount: 0,
        instructions: {
          bn: "নিচের নম্বরে Send Money করুন, তারপর ট্রানজেকশন আইডি দিন।",
          en: "Send Money to the number below, then enter the transaction ID.",
        },
      },
      {
        id: "nagad",
        enabled: false,
        account: "",
        accountType: "Personal",
        maxAmount: 0,
        instructions: {
          bn: "নিচের নম্বরে Send Money করুন, তারপর ট্রানজেকশন আইডি দিন।",
          en: "Send Money to the number below, then enter the transaction ID.",
        },
      },
    ],
  },
};
