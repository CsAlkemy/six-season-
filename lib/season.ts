import { SEASONS, type Season, type Text } from "./types";

export const SEASON_NAME: Record<Season, Text> = {
  grishma: { bn: "গ্রীষ্ম", en: "Summer" },
  barsha: { bn: "বর্ষা", en: "Monsoon" },
  sharat: { bn: "শরৎ", en: "Autumn" },
  hemanta: { bn: "হেমন্ত", en: "Late autumn" },
  sheet: { bn: "শীত", en: "Winter" },
  basanta: { bn: "বসন্ত", en: "Spring" },
};

/**
 * The season on a given instant, by Bangladesh's revised Bangla calendar in Dhaka time (UTC+6, no DST).
 * Each season opens on 1 Boishakh (14 Apr), 1 Asharh (15 Jun), 1 Bhadro (16 Aug), 1 Kartik (17 Oct),
 * 1 Poush (16 Dec) and 1 Falgun (14 Feb). Self-contained, because the head script inlines it with toString().
 */
export function seasonAt(time: number): Season {
  const dhaka = new Date(time + 6 * 36e5);
  const md = (dhaka.getUTCMonth() + 1) * 100 + dhaka.getUTCDate();
  if (md >= 1216) return "sheet";
  if (md >= 1017) return "hemanta";
  if (md >= 816) return "sharat";
  if (md >= 615) return "barsha";
  if (md >= 414) return "grishma";
  if (md >= 214) return "basanta";
  return "sheet";
}

/** Where the visitor's choice is kept: "auto" or a season, and "on" / "off". */
export const SEASON_KEY = "mt-season";
export const MOTION_KEY = "mt-motion";

/**
 * Runs in <head> before the first paint: sets <html data-season data-motion> from ?season= (a preview, not saved),
 * the saved choice, else today's season, with motion off by default for anyone whose system asks for reduced motion.
 */
export const SEASON_SCRIPT = `(function(){var h=document.documentElement,s,m;try{s=localStorage.getItem(${JSON.stringify(SEASON_KEY)});m=localStorage.getItem(${JSON.stringify(MOTION_KEY)})}catch(e){}
s=new URLSearchParams(location.search).get("season")||s;
h.dataset.season=${JSON.stringify(SEASONS)}.indexOf(s)>=0?s:(${seasonAt.toString()})(Date.now());
h.dataset.motion=m==="on"||m==="off"?m:matchMedia("(prefers-reduced-motion: reduce)").matches?"off":"on"})()`;
