import { Manrope, Mina } from "next/font/google";

/** Every Latin letter on the store: a clean, slightly narrow modern sans, set tight in headings. Variable, so one file covers every weight. */
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

/**
 * Bangla, which Manrope doesn't draw: product and season names and the ৳ sign fall through to this, a crisp geometric
 * Bangla that sits well beside Manrope. It comes in two weights only: medium Bangla takes the 400, semibold the 700.
 * Not preloaded, so it never holds up the hero photo; a page downloads only the files its text uses.
 */
export const mina = Mina({
  subsets: ["bengali"],
  weight: ["400", "700"],
  variable: "--font-mina",
  display: "swap",
  preload: false,
});

export const fontVars = `${manrope.variable} ${mina.variable}`;
