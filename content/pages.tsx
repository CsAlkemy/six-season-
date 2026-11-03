import Link from "next/link";
import type { ReactNode } from "react";

import { postDate } from "@/lib/blog";
import { shopCategories } from "@/lib/categories";
import { intlPhone } from "@/lib/site";
import { t, taka } from "@/lib/i18n";
import { type DeliveryZone, type Lang, type Product, type Settings, SOCIAL_NAME, SOCIALS, type Text } from "@/lib/types";

/**
 * The store's plain pages: who we are, how to reach us, delivery and returns, privacy. Google, Meta's and Google's ad
 * accounts and shoppers all look for them. They say only what the store already says elsewhere or what the code does;
 * the numbers (delivery fees and times, payment methods, the days to report a problem) come from the admin's settings.
 * The owner should read the wording once, particularly "If something is wrong", and change what isn't how the store works.
 */
export const PAGE_SLUGS = ["about", "contact", "delivery", "privacy"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export interface PageContext {
  lang: Lang;
  settings: Settings;
  products: Product[];
}

export interface InfoPage {
  title: Text;
  /** The snippet in Google and shared links. */
  description: Text;
  /** schema.org's name for the kind of page. */
  schema: "AboutPage" | "ContactPage" | "WebPage";
  body: Record<Lang, (ctx: PageContext) => ReactNode>;
}

/** The day the privacy page's wording last changed. */
const PRIVACY_UPDATED = "2026-11-03";

const days = (n: number, lang: Lang) => (lang === "bn" ? n.toLocaleString("bn-BD") : String(n));

/** "ঢাকা শহরের ভেতরে: ৳৭০ · ১–২ দিন · ৳১,০০০ এর বেশি অর্ডারে ফ্রি". */
function zoneLine(z: DeliveryZone, lang: Lang) {
  const d = t(lang);
  const parts = [z.fee === 0 ? d.free : taka(z.fee, lang), z.time[lang]];
  if (z.freeAbove > 0) parts.push(lang === "bn" ? `${taka(z.freeAbove, lang)} ${d.freeAbove}` : `${d.freeAbove} ${taka(z.freeAbove, lang)}`);
  return parts.filter(Boolean).join(" · ");
}

/** The ways to reach the store, as list items; only what the admin has filled in. */
function contactItems({ lang, settings }: PageContext) {
  const { phone, whatsapp, email, address, social } = settings.store;
  const bn = lang === "bn";
  return [
    phone && (
      <li key="phone">
        <strong>{bn ? "ফোন" : "Phone"}:</strong> <a href={`tel:${intlPhone(phone)}`}>{phone}</a>
      </li>
    ),
    whatsapp && (
      <li key="whatsapp">
        <strong>{bn ? "হোয়াটসঅ্যাপ" : "WhatsApp"}:</strong>{" "}
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">
          {bn ? "মেসেজ দিন" : "Send a message"}
        </a>
      </li>
    ),
    email && (
      <li key="email">
        <strong>{bn ? "ইমেইল" : "Email"}:</strong> <a href={`mailto:${email}`}>{email}</a>
      </li>
    ),
    address[lang] && (
      <li key="address">
        <strong>{bn ? "ঠিকানা" : "Address"}:</strong> {address[lang]}
      </li>
    ),
    ...SOCIALS.filter((s) => social[s]).map((s) => (
      <li key={s}>
        <strong>{SOCIAL_NAME[s]}:</strong>{" "}
        <a href={social[s]} target="_blank" rel="noopener me">
          {social[s].replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      </li>
    )),
  ].filter(Boolean);
}

export const PAGES: Record<PageSlug, InfoPage> = {
  about: {
    title: { bn: "আমাদের কথা", en: "About us" },
    description: {
      bn: "মাটির টান কী বিক্রি করে আর কেন: নিজেদের খামার ও চেনা কৃষকদের কাছ থেকে সরাসরি আনা খাঁটি ঘি, সরিষার তেল, খেজুরের গুড় আর দেশি ডিম।",
      en: "What Matir Taan sells and why: pure ghee, mustard oil, date-palm jaggery and deshi eggs, straight from our own farm and farmers we know.",
    },
    schema: "AboutPage",
    body: {
      bn: ({ products }) => (
        <>
          <p>{t("bn").about} ছোটবেলার সেই হারানো স্বাদ ফিরিয়ে দেওয়াই আমাদের কাজ।</p>
          <p>আজকাল বাজারে ভেজাল এত সাধারণ যে খাঁটি জিনিস চেনাই কঠিন। তাই আমরা নিজেদের খামার আর যে কৃষকদের নাম ধরে চিনি, তাদের কাছ থেকেই পণ্য আনি। মাঝখানে কোনো মধ্যস্বত্বভোগী নেই।</p>
          <h2>আমরা কী বিক্রি করি</h2>
          <ul>
            {shopCategories(products).map((c) => (
              <li key={c.id}>
                <Link href={`/bn/c/${c.slug}`}>{c.name.bn}</Link>
              </li>
            ))}
          </ul>
          <p>
            কোনটা খাঁটি, কীভাবে চিনবেন, কীভাবে রাখবেন আর কীভাবে রাঁধবেন, সবই লিখেছি <Link href="/bn/blog">মাটির কথা</Link>-য়।
          </p>
          <h2>আমরা যেভাবে কাজ করি</h2>
          <ul>
            <li>
              <strong>চেনা উৎস:</strong> নিজেদের খামার আর যে কৃষকদের আমরা নাম ধরে চিনি।
            </li>
            <li>
              <strong>খাঁটি:</strong> কোনো ভেজাল, রং বা প্রিজারভেটিভ নেই।
            </li>
            <li>
              <strong>ক্যাশ অন ডেলিভারি:</strong> পণ্য হাতে পেয়ে টাকা দিন।
            </li>
            <li>
              <strong>সরাসরি কথা:</strong> অর্ডার নিয়ে বা পণ্য নিয়ে প্রশ্ন থাকলে সরাসরি আমাদের সঙ্গে কথা বলুন।
            </li>
          </ul>
          <blockquote>
            <p>
              অর্ডার, ডেলিভারি বা যেকোনো প্রশ্নে <Link href="/bn/contact">যোগাযোগ</Link> করুন। ডেলিভারির চার্জ, সময় আর পেমেন্টের উপায় আছে <Link href="/bn/delivery">ডেলিভারি ও ফেরত</Link> পাতায়।
            </p>
          </blockquote>
        </>
      ),
      en: ({ products }) => (
        <>
          <p>{t("en").about} Our job is to bring back the lost taste of childhood.</p>
          <p>Adulteration is so common in the market now that the real thing is hard to recognise. So we bring our products from our own farm and from farmers we know by name. There are no middlemen in between.</p>
          <h2>What we sell</h2>
          <ul>
            {shopCategories(products).map((c) => (
              <li key={c.id}>
                <Link href={`/en/c/${c.slug}`}>{c.name.en}</Link>
              </li>
            ))}
          </ul>
          <p>
            How to tell the real thing, keep it and cook it: we write it all up in <Link href="/en/blog">Notes from the soil</Link>.
          </p>
          <h2>How we work</h2>
          <ul>
            <li>
              <strong>Known sources:</strong> our own farm, and farmers we know by name.
            </li>
            <li>
              <strong>Pure:</strong> no adulteration, colour or preservatives.
            </li>
            <li>
              <strong>Cash on delivery:</strong> pay when it reaches you.
            </li>
            <li>
              <strong>Straight talk:</strong> questions about an order or a product go straight to us.
            </li>
          </ul>
          <blockquote>
            <p>
              For orders, delivery or any question, <Link href="/en/contact">contact us</Link>. Delivery charges, times and ways to pay are on the <Link href="/en/delivery">delivery &amp; returns</Link> page.
            </p>
          </blockquote>
        </>
      ),
    },
  },

  contact: {
    title: { bn: "যোগাযোগ", en: "Contact us" },
    description: {
      bn: "মাটির টান-এর ফোন, হোয়াটসঅ্যাপ, ইমেইল আর ঠিকানা। অর্ডার, ডেলিভারি বা পণ্য নিয়ে যেকোনো প্রশ্নে লিখুন বা ফোন করুন।",
      en: "Matir Taan's phone, WhatsApp, email and address. Write or call about an order, a delivery or a product.",
    },
    schema: "ContactPage",
    body: {
      bn: (ctx) => {
        const items = contactItems(ctx);
        return (
          <>
            <p>অর্ডার, ডেলিভারি বা পণ্য নিয়ে কোনো প্রশ্ন থাকলে আমাদের জানান। অর্ডার নিয়ে লিখলে অর্ডার নম্বরটা (যেমন MT-…) দিলে আমরা দ্রুত খুঁজে পাই।</p>
            {items.length > 0 ? <ul>{items}</ul> : <p>অর্ডার করলে আমরা আপনাকে ফোন করে নিশ্চিত করি।</p>}
            <p>
              ডেলিভারি, পেমেন্ট আর পণ্যে সমস্যা হলে কী করবেন, সেটা আছে <Link href="/bn/delivery">ডেলিভারি ও ফেরত</Link> পাতায়।
            </p>
          </>
        );
      },
      en: (ctx) => {
        const items = contactItems(ctx);
        return (
          <>
            <p>If you have a question about an order, a delivery or a product, tell us. When you write about an order, include its number (like MT-…) and we can find it quickly.</p>
            {items.length > 0 ? <ul>{items}</ul> : <p>When you place an order, we call you to confirm it.</p>}
            <p>
              Delivery, payment and what to do if something is wrong are on the <Link href="/en/delivery">delivery &amp; returns</Link> page.
            </p>
          </>
        );
      },
    },
  },

  delivery: {
    title: { bn: "ডেলিভারি ও ফেরত", en: "Delivery & returns" },
    description: {
      bn: "মাটির টান-এর ডেলিভারি এলাকা, চার্জ ও সময়, পেমেন্টের উপায়, আর পণ্যে সমস্যা হলে কী করবেন।",
      en: "Matir Taan's delivery areas, charges and times, ways to pay, and what to do if something is wrong with your order.",
    },
    schema: "WebPage",
    body: {
      bn: ({ settings }) => {
        const zones = settings.delivery.zones.filter((z) => z.active);
        const methods = settings.payments.methods.filter((m) => m.enabled);
        const window = settings.returns.days;
        return (
          <>
            <h2>ডেলিভারি</h2>
            <p>অর্ডার করার পর আমরা ফোন করে নিশ্চিত করি, তারপর পণ্য পাঠাই। ডেলিভারির এলাকা, চার্জ আর সময় নিচে। সময়গুলো আনুমানিক।</p>
            <ul>
              {zones.map((z) => (
                <li key={z.id}>
                  <strong>{z.name.bn}:</strong> {zoneLine(z, "bn")}
                </li>
              ))}
            </ul>
            <h2>পেমেন্ট</h2>
            <ul>
              {methods.map((m) => (
                <li key={m.id}>
                  <strong>{m.name.bn}:</strong> {m.instructions.bn}
                </li>
              ))}
            </ul>
            <h2>পণ্যে সমস্যা হলে</h2>
            <p>
              পণ্য ক্ষতিগ্রস্ত, নষ্ট বা ভুল এলে ছবিসহ আমাদের ফোন বা হোয়াটসঅ্যাপে জানান। আমরা পণ্য বদলে দেব বা টাকা ফেরত দেব।{" "}
              {window > 0 ? `পণ্য হাতে পাওয়ার ${days(window, "bn")} দিনের মধ্যে জানাতে হবে।` : "পণ্য হাতে পাওয়ার পর যত দ্রুত সম্ভব জানান।"}
            </p>
            <p>
              ফোন, হোয়াটসঅ্যাপ আর ইমেইল পাবেন <Link href="/bn/contact">যোগাযোগ</Link> পাতায়।
            </p>
          </>
        );
      },
      en: ({ settings }) => {
        const zones = settings.delivery.zones.filter((z) => z.active);
        const methods = settings.payments.methods.filter((m) => m.enabled);
        const window = settings.returns.days;
        return (
          <>
            <h2>Delivery</h2>
            <p>After you order, we call to confirm it and then send it. The areas we deliver to, with the charge and time for each, are below. Times are estimates.</p>
            <ul>
              {zones.map((z) => (
                <li key={z.id}>
                  <strong>{z.name.en}:</strong> {zoneLine(z, "en")}
                </li>
              ))}
            </ul>
            <h2>Payment</h2>
            <ul>
              {methods.map((m) => (
                <li key={m.id}>
                  <strong>{m.name.en}:</strong> {m.instructions.en}
                </li>
              ))}
            </ul>
            <h2>If something is wrong</h2>
            <p>
              If your order arrives damaged, spoiled or not what you ordered, send us a photo by phone or WhatsApp. We'll replace it or refund you.{" "}
              {window > 0 ? `Tell us within ${window} ${window === 1 ? "day" : "days"} of receiving it.` : "Tell us as soon as you can after it arrives."}
            </p>
            <p>
              Our phone, WhatsApp and email are on the <Link href="/en/contact">contact</Link> page.
            </p>
          </>
        );
      },
    },
  },

  privacy: {
    title: { bn: "গোপনীয়তা নীতি", en: "Privacy policy" },
    description: {
      bn: "মাটির টান আপনার কোন তথ্য নেয়, কেন নেয়, কার সঙ্গে ভাগ করে আর আপনি কী করতে পারেন।",
      en: "What information Matir Taan collects, why, who it's shared with and what you can do about it.",
    },
    schema: "WebPage",
    body: {
      bn: () => (
        <>
          <p>
            এই পাতায় বলা আছে অর্ডার ও অ্যাকাউন্টের জন্য আমরা আপনার কোন তথ্য নিই, কেন নিই আর সেটা নিয়ে আপনি কী করতে পারেন। শেষ হালনাগাদ: {postDate(PRIVACY_UPDATED, "bn")}।
          </p>
          <h2>আমরা কোন তথ্য নিই</h2>
          <ul>
            <li>
              <strong>অর্ডারের সময়:</strong> আপনার নাম, মোবাইল নম্বর, ডেলিভারির ঠিকানা আর (ঐচ্ছিক) বিশেষ নির্দেশনা।
            </li>
            <li>
              <strong>মোবাইল যাচাই:</strong> অর্ডার ও লগইনের সময় আপনার নম্বরে একটি কোড এসএমএস করা হয়।
            </li>
            <li>
              <strong>অ্যাকাউন্ট:</strong> নাম, মোবাইল নম্বর, শেষ ঠিকানা, আর আপনি পাসওয়ার্ড দিলে তার হ্যাশ করা রূপ। আমরা আপনার পাসওয়ার্ড দেখতে পাই না।
            </li>
            <li>
              <strong>রিভিউ:</strong> আপনার নাম, রেটিং আর লেখা প্রকাশ হয়। মোবাইল নম্বর প্রকাশ হয় না।
            </li>
            <li>
              <strong>পেমেন্ট:</strong> বিকাশ বা নগদে পাঠালে শুধু ট্রানজেকশন আইডি রাখি। কার্ড বা পিন আমরা চাই না, রাখিও না।
            </li>
            <li>
              <strong>আপনার ব্রাউজারে:</strong> কার্টে কী আছে তা আপনার ব্রাউজারেই থাকে। লগইন ধরে রাখতে একটি কুকি ব্যবহার হয়।
            </li>
            <li>
              <strong>সাইট ও বিজ্ঞাপনের পরিসংখ্যান:</strong> সাইট কেমন চলছে বুঝতে আমরা Google Analytics আর বিজ্ঞাপনের ফল মাপতে Meta Pixel ব্যবহার করতে পারি। এগুলো কুকি ব্যবহার করে এবং কোন পাতা দেখেছেন, কী কার্টে রেখেছেন, কী কিনেছেন সেই তথ্য নেয়। আপনার নাম, ফোন বা ঠিকানা এগুলোকে পাঠানো হয় না।
            </li>
          </ul>
          <h2>কেন নিই</h2>
          <p>অর্ডার নিশ্চিত করতে, পণ্য পৌঁছে দিতে, অর্ডারের খোঁজ দিতে আর সাইট ভালো করতে। আপনার তথ্য আমরা বিক্রি করি না।</p>
          <h2>কার সঙ্গে ভাগ করি</h2>
          <ul>
            <li>ডেলিভারির জন্য কুরিয়ার বা ডেলিভারি কর্মী (নাম, ফোন, ঠিকানা)।</li>
            <li>এসএমএস পাঠানোর সেবা (আপনার মোবাইল নম্বর)।</li>
            <li>ওয়েবসাইট চালানো ও তথ্য রাখার সেবা।</li>
            <li>চালু থাকলে Google ও Meta (ওপরের পরিসংখ্যানের তথ্য)।</li>
            <li>আইন বা আদালতের নির্দেশ থাকলে যতটুকু প্রয়োজন।</li>
          </ul>
          <h2>কতদিন রাখি</h2>
          <p>অর্ডার, হিসাব আর আইনের প্রয়োজনে যতদিন লাগে ততদিন।</p>
          <h2>আপনি কী করতে পারেন</h2>
          <p>
            আপনার তথ্য দেখতে, ঠিক করতে বা মুছে দিতে চাইলে <Link href="/bn/contact">আমাদের জানান</Link>। অ্যাকাউন্টে ঢুকে নাম আর ঠিকানা নিজেও বদলাতে পারেন। ব্রাউজারের সেটিংসে কুকি বন্ধ করা যায়।
          </p>
          <h2>এই নীতি বদলালে</h2>
          <p>বদলালে এই পাতায় নতুন তারিখসহ দেওয়া হবে।</p>
        </>
      ),
      en: () => (
        <>
          <p>
            This page says what information we collect for orders and accounts, why, and what you can do about it. Last updated: {postDate(PRIVACY_UPDATED, "en")}.
          </p>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>When you order:</strong> your name, mobile number, delivery address and (optionally) a delivery note.
            </li>
            <li>
              <strong>Mobile verification:</strong> when you order or log in, we text a code to your number.
            </li>
            <li>
              <strong>Your account:</strong> name, mobile number, last address and, if you set one, a hashed form of your password. We can't see your password.
            </li>
            <li>
              <strong>Reviews:</strong> your name, rating and text are shown. Your mobile number is not.
            </li>
            <li>
              <strong>Payment:</strong> if you pay by bKash or Nagad we keep only the transaction ID. We don't ask for or keep card details or PINs.
            </li>
            <li>
              <strong>In your browser:</strong> what's in your cart stays in your browser. A cookie keeps you logged in.
            </li>
            <li>
              <strong>Site and ad statistics:</strong> to see how the site is doing we may use Google Analytics, and to measure ads, the Meta Pixel. They use cookies and record which pages you viewed, what you added to your cart and what you bought. Your name, phone number and address are not sent to them.
            </li>
          </ul>
          <h2>Why</h2>
          <p>To confirm your order, deliver it, keep you updated about it and improve the site. We don't sell your information.</p>
          <h2>Who we share it with</h2>
          <ul>
            <li>A courier or delivery person, for delivery (name, phone, address).</li>
            <li>A text-message service (your mobile number).</li>
            <li>The services that run the website and store its data.</li>
            <li>Google and Meta, when switched on (the statistics above).</li>
            <li>Anyone the law or a court requires us to, to the extent it requires.</li>
          </ul>
          <h2>How long we keep it</h2>
          <p>As long as we need it for orders, accounts and the law.</p>
          <h2>What you can do</h2>
          <p>
            To see, correct or delete your information, <Link href="/en/contact">tell us</Link>. In your account you can also change your name and address yourself. Cookies can be switched off in your browser's settings.
          </p>
          <h2>If this changes</h2>
          <p>We'll post the new version here with its date.</p>
        </>
      ),
    },
  },
};
