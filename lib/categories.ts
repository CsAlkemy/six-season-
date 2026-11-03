import type { Lang, Product, Text } from "./types";

/**
 * What the store sells, as pages people can search for: /bn/c/ghee for "খাঁটি ঘি" while each product's own page serves
 * the specific one. The wording stays within what the store says about its products elsewhere. A product joins a
 * category from the admin (Products › Category); the four starter products are in theirs by id until it's saved.
 */
export interface Category {
  id: string;
  /** The URL: /bn/c/<slug>. */
  slug: string;
  name: Text;
  /** The page's title in Google (the store's name follows it). */
  title: Text;
  /** The snippet in Google and shared links. */
  description: Text;
  /** The page's opening text, a paragraph each. */
  intro: Record<Lang, string[]>;
}

export const CATEGORIES: Category[] = [
  {
    id: "ghee",
    slug: "ghee",
    name: { bn: "খাঁটি ঘি", en: "Pure ghee" },
    title: { bn: "খাঁটি গাওয়া ঘি কিনুন, ঘরে বসে", en: "Buy pure cow ghee online in Bangladesh" },
    description: {
      bn: "দেশি গরুর দুধের ননী থেকে ধীরে জ্বাল দিয়ে তৈরি খাঁটি গাওয়া ঘি। দানাদার, সুগন্ধি, কোনো ভেজাল বা রং নেই। ক্যাশ অন ডেলিভারি।",
      en: "Pure cow ghee slow-cooked from the cream of local cows' milk: grainy and fragrant, with no additives or colour. Cash on delivery.",
    },
    intro: {
      bn: [
        "গাওয়া ঘি মানে দেশি গরুর দুধের ননী থেকে ধীরে জ্বাল দিয়ে তৈরি ঘি। আমাদের ঘিতে কোনো ভেজাল, রং বা কৃত্রিম গন্ধ নেই। ঘরের তাপমাত্রায় এটা দানাদার হয়ে জমে, আর গন্ধেই বোঝা যায় এটা আসল।",
        "ভাত, খিচুড়ি, পরোটা বা পায়েস, যেখানেই ঘি লাগে, একটু খাঁটি ঘি পুরো স্বাদটাই বদলে দেয়। নিচে আমাদের ঘি দেখুন, আর খাঁটি ঘি কীভাবে চিনবেন সে নিয়ে মাটির কথা-র লেখাগুলোও পড়ে নিতে পারেন।",
      ],
      en: [
        "Gawa ghee is ghee made by slow-cooking the cream of local cows' milk. Ours has no additives, colour or artificial flavour. At room temperature it sets grainy, and the smell tells you it's the real thing.",
        "Over rice, khichuri, paratha or payesh, a little pure ghee changes the whole dish. See our ghee below, and read our notes on how to tell pure ghee from the adulterated kind.",
      ],
    },
  },
  {
    id: "mustard-oil",
    slug: "mustard-oil",
    name: { bn: "সরিষার তেল", en: "Mustard oil" },
    title: { bn: "ঘানি ভাঙা সরিষার তেল কিনুন", en: "Buy cold-pressed mustard oil online" },
    description: {
      bn: "কাঠের ঘানিতে ভাঙা খাঁটি সরিষার তেল। ঝাঁঝালো ঘ্রাণ, রান্না ও ভর্তার জন্য সেরা। কোনো ভেজাল নেই। ক্যাশ অন ডেলিভারি।",
      en: "Pure mustard oil pressed in a wooden ghani, with a sharp aroma that's perfect for cooking and bhorta. No adulteration. Cash on delivery.",
    },
    intro: {
      bn: [
        "ঘানি ভাঙা সরিষার তেল মানে সরিষা পিষে সরাসরি বের করা তেল, যেখানে সরিষার ঝাঁঝালো ঘ্রাণ আর স্বাদ রয়ে যায়। আমাদের তেল কাঠের ঘানিতে ভাঙা, খাঁটি, কোনো ভেজাল ছাড়া।",
        "ভর্তা, মাছের ঝোল বা সবজি, বাঙালি রান্নায় এই ঝাঁঝটাই আসল। কাঁচা সরিষার তেল কীভাবে ব্যবহার করবেন, আর ভেজাল তেল কীভাবে ধরবেন, তা নিয়ে আমাদের লেখাগুলো দেখুন।",
      ],
      en: [
        "Ghani-pressed mustard oil is oil pressed straight from the seed, so the sharp aroma and flavour of mustard stay in it. Ours is pressed in a wooden ghani: pure, with nothing added.",
        "In bhorta, fish curry or vegetables, that sharpness is what Bengali cooking is about. Read our notes on cooking with raw mustard oil and on how to spot the adulterated kind.",
      ],
    },
  },
  {
    id: "gur",
    slug: "khejur-gur",
    name: { bn: "খেজুরের গুড়", en: "Date-palm jaggery" },
    title: { bn: "খেজুরের পাটালি গুড় কিনুন", en: "Buy date-palm jaggery (khejur gur) online" },
    description: {
      bn: "শীতের ভোরে নামানো খেজুর রস জ্বাল দিয়ে তৈরি পাটালি গুড়। চিনি মেশানো নেই। শীতের মৌসুমি পণ্য। ক্যাশ অন ডেলিভারি।",
      en: "Patali jaggery made from date-palm sap collected on winter mornings. No added sugar, and a winter-season product. Cash on delivery.",
    },
    intro: {
      bn: [
        "খেজুরের গুড় শীতের পণ্য। গাছ থেকে ভোরে নামানো রস জ্বাল দিয়ে তৈরি হয় পাটালি গুড়। আমাদের গুড়ে চিনি মেশানো নেই।",
        "পায়েস, পিঠা, নলেন গুড়ের সন্দেশ বা শুধু এক টুকরো, শীতের স্বাদটাই আলাদা। গুড় আসল কিনা কীভাবে বুঝবেন, সেটা নিয়ে মাটির কথা-য় লিখেছি।",
      ],
      en: [
        "Khejur gur is a winter product. Sap collected from the trees in the morning is boiled down into patali jaggery. Ours has no added sugar.",
        "In payesh, pitha, nolen gur sandesh or on its own, it tastes of winter. Read our notes on how to tell real jaggery from the mixed kind.",
      ],
    },
  },
  {
    id: "eggs",
    slug: "deshi-eggs",
    name: { bn: "দেশি ডিম", en: "Deshi eggs" },
    title: { bn: "দেশি মুরগির ডিম কিনুন", en: "Buy free-range deshi eggs online" },
    description: {
      bn: "খোলা উঠানে চরে বেড়ানো দেশি মুরগির ডিম। গাঢ় কুসুম, প্রতিদিন সংগ্রহ করা। ক্যাশ অন ডেলিভারি।",
      en: "Eggs from deshi hens that roam open yards: deep yolks, collected daily. Cash on delivery.",
    },
    intro: {
      bn: [
        "দেশি ডিম মানে খোলা উঠানে চরে বেড়ানো দেশি মুরগির ডিম। আকারে ছোট, কুসুম গাঢ়, আর আমরা প্রতিদিন সংগ্রহ করি।",
        "দেশি ডিমের সঙ্গে ফার্মের ডিমের পার্থক্য কী, ডিম তাজা কিনা কীভাবে বুঝবেন আর কীভাবে রাখবেন: সব আমাদের লেখায় আছে।",
      ],
      en: [
        "Deshi eggs come from deshi hens that roam open yards. They're small, with deep yolks, and we collect them daily.",
        "How deshi eggs differ from farm eggs, how to tell whether an egg is fresh and how to store them: it's all in our notes.",
      ],
    },
  },
];

/** The category a product is in: the one chosen in the admin, or (before that) the starter product's own. */
export const categoryOf = (product: Product): Category | undefined => CATEGORIES.find((c) => c.id === (product.category ?? product.id));

export const findCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

/** The shop's active products in a category, in the store's order. */
export const productsIn = (category: Category, products: Product[]) => products.filter((p) => p.active && categoryOf(p)?.id === category.id);

/** The categories worth a page and a link: those with something to buy. */
export const shopCategories = (products: Product[]) => CATEGORIES.filter((c) => productsIn(c, products).length > 0);
