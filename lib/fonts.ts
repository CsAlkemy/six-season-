import { Baloo_Da_2, Hind_Siliguri } from "next/font/google";

/** Headings and prices: rounded like the logo, with Bangla and Latin in one family. */
export const baloo = Baloo_Da_2({ subsets: ["bengali", "latin"], variable: "--font-baloo", display: "swap" });

/** Body copy: a quiet Bangla-first sans whose Latin sits well beside it. */
export const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

export const fontVars = `${baloo.variable} ${hind.variable}`;
