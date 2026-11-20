import { blurOf } from "@/lib/blur";
import { blurStyle } from "@/lib/blur-style";
import { t } from "@/lib/i18n";
import { isCash } from "@/lib/payments";
import { sized } from "@/lib/photo-sizes";
import type { Lang, Product, Settings } from "@/lib/types";
import { photosOf } from "@/lib/variants";

import { CashIcon, CheckIcon, LeafIcon, PhoneIcon, ShieldIcon, TruckIcon } from "../icons";

/** What a shopper can count on, worked out from the settings: never a promise the store hasn't set up. */
export function storeFacts(settings: Settings, lang: Lang) {
  const cash = settings.payments.methods.some((m) => m.enabled && isCash(m));
  // The admin lists delivery areas nearest first, so the first is the quickest.
  const zone = settings.delivery.zones.find((z) => z.active);
  const quickest = zone ? `${zone.name[lang]} ${zone.time[lang]}`.trim() : "";
  return { cash, quickest };
}

/** "মাটির টানে, খাঁটি খাবার" → the two lines MindFuel-style titles are set in: split at the first comma or line break. */
function titleLines(title: string): { first: string; comma: string; second: string } | null {
  const m = title.match(/^([^,،\n]+)([,،]?)\s*\n?\s*(.+)$/s);
  return m && m[3] && (m[2] || title.includes("\n")) ? { first: m[1]!.trim(), comma: m[2]!, second: m[3]!.trim() } : null;
}

/** The title's last word gets the thick underline. */
function marked(line: string) {
  const at = line.lastIndexOf(" ");
  return at < 0 ? <span className="hero-mark">{line}</span> : (
    <>
      {line.slice(0, at)} <span className="hero-mark">{line.slice(at + 1)}</span>
    </>
  );
}

/**
 * The top of the home page, set like MindFuel's: full width and tall, a tilted sticker, the title in two lines (the
 * first outlined like a sticker, the last word of the second underlined), the store's checklist, one wide button to
 * the products and a line of plain facts (cash on delivery, the quickest delivery). Behind it on wide screens, the
 * hero photo with the text on its left; without one, the products' own photos as a little spread of prints. On a
 * phone the photo comes under the text, and the products' photos are a row of four so the products aren't far down.
 * Everything is in Settings › Home page.
 */
export async function HomeHero({ lang, settings, products, target }: { lang: Lang; settings: Settings; products: Product[]; target: string }) {
  const d = t(lang);
  const { hero } = settings.home;
  const points = hero.points.map((p) => p[lang]).filter(Boolean);
  const { cash, quickest } = storeFacts(settings, lang);
  const note = [cash && d.codBody, quickest].filter(Boolean).join(" · ");
  const photos = hero.image ? [] : products.flatMap((p) => photosOf(p).slice(0, 1)).slice(0, 4);
  const heroBlur = hero.image ? await blurOf(hero.image) : null;
  const title = hero.title[lang];
  const lines = titleLines(title);

  return (
    <section className={`home-hero relative isolate overflow-hidden max-lg:flex max-lg:flex-col ${hero.image ? "home-hero-photo" : ""}`}>
      {hero.image && (
        <img
          {...sized(hero.image, "100vw")}
          alt=""
          fetchPriority="high"
          style={blurStyle(heroBlur)}
          className="aspect-[4/3] w-full object-cover lg:absolute lg:inset-0 lg:-z-20 lg:aspect-auto lg:h-full lg:object-[75%_center] max-lg:order-last"
        />
      )}
      <div className="container-page grid items-center gap-10 py-10 sm:py-14 lg:min-h-[min(82vh,46rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-16">
        <div className="flex flex-col items-start gap-6 lg:gap-7">
          {/* The sticker is one of the places the English store speaks Bangla. */}
          {(hero.badge.bn || hero.badge[lang]) && (
            <span className="hero-badge" lang={hero.badge.bn ? "bn" : undefined}>
              {hero.badge.bn || hero.badge[lang]}
            </span>
          )}
          <h1 className="hero-title">
            {lines ? (
              <>
                <span className="hero-outline block">
                  {lines.first}
                  {lines.comma && <span className="sr-only">{lines.comma}</span>}
                </span>
                <span className="block">{marked(lines.second)}</span>
              </>
            ) : (
              marked(title)
            )}
          </h1>
          {hero.subtitle[lang] && <p className="max-w-xl text-body-lg text-fg-secondary">{hero.subtitle[lang]}</p>}
          {points.length > 0 && (
            <ul className="flex flex-col gap-3">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3 font-display text-body-lg font-medium sm:text-h4/snug">
                  <CheckIcon className="mt-1 size-5 shrink-0 sm:size-6" />
                  {point}
                </li>
              ))}
            </ul>
          )}
          {hero.cta[lang] && (
            <a href={`#${target}`} className="hero-cta">
              {hero.cta[lang]}
            </a>
          )}
          {note && <p className="-mt-2 text-body-sm text-fg-secondary sm:text-body-md">{note}</p>}
        </div>

        {photos.length > 0 && (
          <div className="relative">
            {/* A phone: a row of four small squares. Wide: a spread of prints, turned a little, overlapping. */}
            <div className="grid grid-cols-4 gap-2.5 lg:hidden">
              {photos.map((src, i) => (
                <img key={src} {...sized(src, "25vw")} alt="" fetchPriority={i === 0 ? "high" : undefined} className="aspect-square w-full rounded-lg bg-muted object-cover shadow-md" />
              ))}
            </div>
            <div className="hero-spread relative hidden aspect-[6/5] lg:block" data-count={photos.length}>
              {photos.map((src) => (
                <img key={src} {...sized(src, "(min-width: 1440px) 340px, 24vw")} alt="" className="hero-print" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
/**
 * A band of what every order comes with, under the hero: each line only when the settings make it true (a cash
 * method on, a delivery area), the purity promise the product pages make, the confirmation call, and the returns
 * policy one tap away.
 */
export function TrustStrip({ lang, settings }: { lang: Lang; settings: Settings }) {
  const d = t(lang);
  const { cash, quickest } = storeFacts(settings, lang);
  const items = [
    cash && { icon: CashIcon, text: d.codTitle },
    quickest && { icon: TruckIcon, text: quickest },
    { icon: LeafIcon, text: d.pureTitle },
    { icon: PhoneIcon, text: d.confirmCall },
    { icon: ShieldIcon, text: d.returnsShort, href: `/${lang}/returns` },
  ].filter((item): item is { icon: typeof CashIcon; text: string; href?: string } => Boolean(item));

  return (
    <div className="bg-brand text-fg-inverse">
      <ul className="container-page grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-body-sm sm:flex sm:flex-wrap sm:justify-center sm:gap-x-10 sm:py-5 sm:text-body-md">
        {items.map(({ icon: Icon, text, href }) => (
          <li key={text} className="flex items-center gap-2.5">
            <Icon className="size-5 shrink-0 opacity-90" />
            {href ? (
              <a href={href} className="underline-offset-4 hover:underline">
                {text}
              </a>
            ) : (
              text
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
