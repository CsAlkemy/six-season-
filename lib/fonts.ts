import { Baloo_Da_2, Hind_Siliguri } from "next/font/google";

/** Headings and prices: rounded like the logo, with Bangla and Latin in one family. */
export const baloo = Baloo_Da_2({ subsets: ["bengali", "latin"], variable: "--font-baloo", display: "swap" });

/**
 * Body copy: a quiet Bangla-first sans whose Latin sits well beside it. Not preloaded: that fetched all eight files
 * (both scripts, every weight) ahead of the product photo; now a page downloads only the ones its text uses. No 700:
 * headings are Baloo, and <strong> in body text takes 600.
 */
export const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hind",
  display: "swap",
  preload: false,
});

export const fontVars = `${baloo.variable} ${hind.variable}`;
