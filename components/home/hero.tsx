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

/**
 * The top of the home page: the store's headline, its checklist of reasons to buy, one button to the products and
 * a line of plain facts (cash on delivery, the quickest delivery) beside a photo. Without a hero photo, the products'
 * own photos stand in, so the first thing a visitor sees is what's for sale. Everything is in Settings › Home page.
 */
export async function HomeHero({ lang, settings, products, target }: { lang: Lang; settings: Settings; products: Product[]; target: string }) {
  const d = t(lang);
  const { hero } = settings.home;
  const points = hero.points.map((p) => p[lang]).filter(Boolean);
  const { cash, quickest } = storeFacts(settings, lang);
  const note = [cash && d.codBody, quickest].filter(Boolean).join(" · ");
  const photos = hero.image ? [] : products.flatMap((p) => photosOf(p).slice(0, 1)).slice(0, 4);
  const heroBlur = hero.image ? await blurOf(hero.image) : null;

  return (
    <section className="container-page pt-6 sm:pt-8">
      <div className="home-hero grid items-center gap-8 overflow-hidden rounded-xl p-6 sm:p-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:p-14">
        <div className="flex flex-col items-start gap-6">
          <h1 className="text-h2 text-balance sm:text-h1">{hero.title[lang]}</h1>
          {hero.subtitle[lang] && <p className="max-w-xl text-body-lg text-fg-secondary">{hero.subtitle[lang]}</p>}
          {points.length > 0 && (
            <ul className="flex flex-col gap-3">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-body-lg">
                  <CheckIcon className="mt-1 size-5 shrink-0 text-fg-brand" />
                  {point}
                </li>
              ))}
            </ul>
          )}
          {hero.cta[lang] && (
            <a href={`#${target}`} className="btn-primary h-13 min-w-56 text-label-md max-sm:w-full">
              {hero.cta[lang]}
            </a>
          )}
          {note && <p className="text-body-sm text-fg-secondary">{note}</p>}
        </div>

        {hero.image ? (
          <img
            {...sized(hero.image, "(min-width: 1440px) 640px, (min-width: 1024px) 46vw, 100vw")}
            alt=""
            fetchPriority="high"
            style={blurStyle(heroBlur)}
            className="aspect-[4/3] w-full rounded-lg bg-muted object-cover"
          />
        ) : (
          photos.length > 0 && (
            // Four small squares in a row on a phone, so the products below aren't pushed far down; two by two beside the text.
            <div className={`grid gap-3 ${photos.length >= 4 ? "grid-cols-4 lg:grid-cols-2" : (["grid-cols-1", "grid-cols-2", "grid-cols-3"][photos.length - 1] ?? "")}`}>
              {photos.map((src, i) => (
                <img
                  key={src}
                  {...sized(src, "(min-width: 1440px) 320px, (min-width: 1024px) 23vw, 25vw")}
                  alt=""
                  fetchPriority={i === 0 ? "high" : undefined}
                  className="aspect-square w-full rounded-lg bg-muted object-cover"
                />
              ))}
            </div>
          )
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
    <div className="mt-6 bg-brand text-fg-inverse sm:mt-8">
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
