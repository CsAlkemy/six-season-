import Link from "next/link";

import { blurOf } from "@/lib/blur";
import { blurStyle } from "@/lib/blur-style";
import { t } from "@/lib/i18n";
import { letter, type Lettering } from "@/lib/lettering";
import { sized } from "@/lib/photo-sizes";
import { SHOP_PATH } from "@/lib/shop-query";
import { waNumber } from "@/lib/site";
import type { Lang, Product, Settings } from "@/lib/types";
import { photosOf } from "@/lib/variants";

import { ArrowRightIcon } from "../icons";

/**
 * A lettered headline at the headline's font size: a width of its own in em (the column shrinks to fit its contents,
 * so a percentage has nothing to go by), never wider than the column.
 */
function Lettered({ lettering, className }: { lettering: Lettering; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox={lettering.viewBox}
      className={`hero-lettering block ${className}`}
      style={{ width: `${lettering.width}em`, maxWidth: "100%", aspectRatio: `${lettering.width} / ${lettering.height}` }}
      dangerouslySetInnerHTML={{ __html: lettering.inner }}
    />
  );
}

/**
 * The top of the home page (Settings › Home page), like Motherhood's banner: one wide photo across a deep green
 * panel, the products on its right, its left side fading away into the green so the words sit on clean colour, with no
 * line between the two. On a phone the photo sits on top and fades down into the green, with the words under it.
 * Without the admin's photo, the first product's stands in. A line break in the title starts a new line; a Bangla
 * title is lettered in Li Alinur Niladri (lib/lettering.ts). The button opens the shop.
 */
export async function HomeHero({ lang, settings, products }: { lang: Lang; settings: Settings; products: Product[] }) {
  const d = t(lang);
  const { hero } = settings.home;

  const stand = hero.image ? null : products.find((p) => photosOf(p).length > 0);
  const photo = hero.image ?? (stand ? photosOf(stand)[0]! : null);
  const photoBlur = hero.image ? await blurOf(hero.image) : (stand?.blur?.[photo ?? ""] ?? null);

  const lines = hero.title[lang].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  // A Bangla headline (typed in either language's box) is marked so it gets Bangla's line height and spacing.
  const bangla = /[\u0980-\u09FF]/.test(hero.title[lang]);
  // A Bangla headline is lettered in Li Alinur Niladri. A drawing can't rewrap, so there are two: about 10em to a line
  // (the most that fits beside the photo) from 640px up, and about 7.5em on a phone, so its letters keep their size.
  const wide = bangla ? await letter(lines, 10.3) : null;
  const narrow = wide ? await letter(lines, 7.6) : null;
  const oneDrawing = !narrow || narrow.viewBox === wide?.viewBox;
  const subtitle = hero.subtitle[lang];
  const cta = hero.cta[lang];
  const whatsapp = settings.store.whatsapp;

  return (
    <section className="container-page pt-4 sm:pt-8">
      <div className="home-hero relative isolate flex flex-col overflow-hidden rounded-[1.75rem] lg:min-h-140 lg:flex-row lg:items-center">
        {photo && (
          <div className="relative h-72 sm:h-96 lg:absolute lg:inset-0 lg:-z-10 lg:h-auto">
            <img
              {...sized(photo, "(min-width: 1440px) 1328px, 100vw")}
              alt=""
              fetchPriority="high"
              style={blurStyle(photoBlur)}
              className="hero-photo absolute inset-0 size-full object-cover object-[88%_center] lg:object-right"
            />
          </div>
        )}

        <div className={`relative flex max-w-[54rem] flex-col items-start gap-4 px-6 pb-8 text-fg-inverse sm:gap-5 sm:px-10 sm:pb-12 lg:gap-6 lg:p-18 ${photo ? "-mt-10 lg:mt-0" : "pt-10"}`}>
          <h1 lang={bangla ? "bn" : undefined} className="hero-title text-balance">
            {wide ? (
              <>
                {/* The words themselves for search engines and screen readers; the drawing is what people see. */}
                <span className="sr-only">{lines.join(" ")}</span>
                {oneDrawing ? (
                  <Lettered lettering={wide} className="" />
                ) : (
                  <>
                    <Lettered lettering={narrow!} className="sm:hidden" />
                    <Lettered lettering={wide} className="max-sm:hidden" />
                  </>
                )}
              </>
            ) : (
              lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                  {i < lines.length - 1 ? " " : ""}
                </span>
              ))
            )}
          </h1>
          {subtitle && <p className="max-w-115 text-body-md opacity-85 sm:text-body-lg">{subtitle}</p>}
          {(cta || whatsapp) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-7 gap-y-3 sm:mt-2">
              {cta && (
                <Link href={SHOP_PATH} className="hero-cta group/cta inline-flex h-14 items-center gap-3 rounded-full pr-2 pl-6 text-label-button whitespace-nowrap transition-colors sm:h-15 sm:pl-7.5">
                  {cta}
                  <span aria-hidden className="grid size-10 place-items-center rounded-full bg-brand text-fg-inverse transition-transform duration-300 group-hover/cta:translate-x-0.5 sm:size-11">
                    <ArrowRightIcon className="size-4.5 sm:size-5" />
                  </span>
                </Link>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${waNumber(whatsapp)}`}
                  target="_blank"
                  rel="noopener"
                  className="rounded-sm text-label-button underline decoration-[1.5px] underline-offset-[6px] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg-inverse"
                >
                  {d.orderOnWhatsApp}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
