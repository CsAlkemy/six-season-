import { type Email, esc, layout } from "./email";
import { STORE_NAME } from "./i18n";
import type { Lang } from "./types";

/** "r•••@gmail.com": enough for the shopper to know where to look, without showing the address to whoever typed the number. */
export const maskEmail = (email: string) => {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}•••@${domain}`;
};

/** The password reset email, in the shopper's language. */
export function resetEmail(lang: Lang, phone: string, url: string, to: string): Email {
  const bn = lang === "bn";
  const body = bn
    ? `<p style="margin:0">আপনার অ্যাকাউন্টের (${esc(phone)}) পাসওয়ার্ড রিসেট করতে নিচের বোতামটি চাপুন। লিংকটি ৩০ মিনিট কাজ করবে, একবারই।</p><p style="margin:12px 0 0;color:#7a6a5c;font-size:13px">আপনি রিসেট না চেয়ে থাকলে এই ইমেইলটি এড়িয়ে যান; আপনার পাসওয়ার্ড বদলাবে না।</p>`
    : `<p style="margin:0">Press the button to choose a new password for your account (${esc(phone)}). The link works once, for 30 minutes.</p><p style="margin:12px 0 0;color:#7a6a5c;font-size:13px">If you didn't ask for this, ignore this email; your password stays as it is.</p>`;
  return {
    to: [to],
    subject: bn ? `${STORE_NAME.bn}: পাসওয়ার্ড রিসেট` : `Reset your ${STORE_NAME.en} password`,
    html: layout({ title: bn ? "পাসওয়ার্ড রিসেট" : "Reset your password", body, button: { label: bn ? "নতুন পাসওয়ার্ড দিন" : "Choose a new password", href: url } }),
    text: bn
      ? `আপনার অ্যাকাউন্টের (${phone}) পাসওয়ার্ড রিসেট করতে এই লিংকটি খুলুন (৩০ মিনিট, একবারই):\n${url}\n\nআপনি না চাইলে এই ইমেইলটি এড়িয়ে যান।`
      : `Open this link to choose a new password for your account (${phone}). It works once, for 30 minutes:\n${url}\n\nIf you didn't ask for this, ignore this email.`,
  };
}

/** What the team sends on WhatsApp to the account's number; the shopper's language isn't known, so both. */
export const resetWhatsApp = (url: string) =>
  `${STORE_NAME.bn}: পাসওয়ার্ড রিসেট করতে এই লিংকটি খুলুন (২৪ ঘণ্টা, একবারই):\n${url}\n\n${STORE_NAME.en}: open this link to choose a new password (works once, for 24 hours):\n${url}`;
