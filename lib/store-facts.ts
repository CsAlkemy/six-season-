import { isCash } from "./payments";
import type { Lang, Settings } from "./types";

/** What a shopper can count on, worked out from the settings: never a promise the store hasn't set up. */
export function storeFacts(settings: Settings, lang: Lang) {
  const cash = settings.payments.methods.some((m) => m.enabled && isCash(m));
  // The admin lists delivery areas nearest first, so the first is the quickest.
  const zone = settings.delivery.zones.find((z) => z.active);
  const quickest = zone ? `${zone.name[lang]} ${zone.time[lang]}`.trim() : "";
  return { cash, quickest };
}
