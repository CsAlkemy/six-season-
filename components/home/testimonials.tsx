import { t } from "@/lib/i18n";
import { sized } from "@/lib/photo-sizes";
import { initials, shownTestimonials } from "@/lib/testimonials";
import type { Lang, Settings, Testimonial } from "@/lib/types";

import { QuoteIcon } from "../icons";
import { TestimonialCarousel, TestimonialVideo } from "./testimonial-carousel";

/**
 * Every card is a phone screen's shape (9:16), written or video, so they line up as one row. 78% of the width on a
 * phone, so the next one peeks in; three across from 1024px and four from 1280px, gaps included. A card with more
 * words than fit grows, and the row grows with it.
 */
const CARD = "@container relative flex aspect-[9/16] w-[78%] max-w-80 shrink-0 snap-start flex-col rounded-[1.75rem] sm:w-72 lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]";
/** How wide a card shows, for its cover's sizes. */
const CARD_SIZES = "(min-width: 1440px) 314px, (min-width: 1024px) 304px, (min-width: 640px) 288px, 78vw";

/**
 * The words' size as a share of the card's width (cqi), so they fill a card the same way at every screen width: the
 * fewer the words, the bigger. 104 / sqrt(characters) was measured on English and Bangla from a 360px phone to a wide
 * screen to fit with room to spare: a line of feedback is heading-sized (capped at 15cqi, 47px on the widest card),
 * the longest allowed (280) still 16px on the smallest phone. Words that wrap worse than that make the card taller.
 */
const quoteSize = (text: string) => `${Math.min(15, 104 / Math.sqrt(Math.max(text.length, 1))).toFixed(2)}cqi`;

/** Written cards take turns between the products' card colour and the open question's soft green. */
const TONES = ["season-card", "bg-brand-soft shadow-card"];

/** Who said it: their photo or initials, name, and what they do. White over a video. */
function Person({ item, onVideo = false }: { item: Testimonial; onVideo?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {item.avatar ? (
        <img {...sized(item.avatar, "48px")} alt="" loading="lazy" decoding="async" className={`size-12 shrink-0 rounded-full object-cover ${onVideo ? "ring-2 ring-neutral-0/70" : ""}`} />
      ) : (
        <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-full text-label ${onVideo ? "bg-surface text-fg-brand" : "bg-brand text-fg-inverse"}`}>{initials(item.name)}</span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className={`truncate text-label ${onVideo ? "text-fg-inverse [text-shadow:0_1px_3px_#0009]" : "text-fg-primary"}`}>{item.name}</span>
        <span className={`truncate text-body-sm ${onVideo ? "text-neutral-0/90 [text-shadow:0_1px_3px_#0009]" : "text-fg-secondary"}`}>{item.role}</span>
      </span>
    </div>
  );
}

/**
 * What customers said, above the questions (Settings › Home page › Customer feedback): written feedback set big, and
 * videos as they filmed them, upright, played on the card. Each card names who said it, with their photo and what they
 * do. Hidden until the admin switches one on.
 */
export function Testimonials({ lang, settings }: { lang: Lang; settings: Settings }) {
  const d = t(lang);
  const list = shownTestimonials(settings.home.testimonials);
  if (!list.length) return null;
  let written = 0;

  return (
    <section id="feedback" aria-labelledby="feedback-title" className="flex scroll-mt-24 flex-col gap-8 sm:gap-10">
      <header className="container-page flex flex-col items-center gap-3 text-center">
        <p className="font-display text-label-md text-soil-700">{d.feedbackEyebrow}</p>
        <h2 id="feedback-title" className="text-h2 text-balance sm:text-h1">{d.feedbackTitle}</h2>
      </header>

      {/* The heading keeps to the page's frame; the cards run the window's full width. */}
      <TestimonialCarousel label={d.feedbackTitle} previous={d.previous} next={d.next}>
        {list.map((item) =>
          item.kind === "video" && item.video ? (
            <li key={item.id} className={`${CARD} overflow-hidden bg-neutral-900`}>
              <TestimonialVideo src={item.video} poster={item.poster ? sized(item.poster, CARD_SIZES) : null} label={d.playVideo.replace("{name}", item.name)}>
                <Person item={item} onVideo />
              </TestimonialVideo>
            </li>
          ) : (
            <li key={item.id} className={`${CARD} ${TONES[written++ % TONES.length]}`}>
              <figure className="flex flex-1 flex-col gap-6 p-6 sm:p-7">
                {/* The mark and the words sit in the middle of the card, so a short one doesn't leave a gap under it. */}
                <div className="flex flex-1 flex-col justify-center gap-5">
                  <QuoteIcon className="size-11 shrink-0 text-fg-brand" />
                  <blockquote>
                    <p style={{ fontSize: quoteSize(item.text) }} className="font-display leading-[1.3] font-medium tracking-[-0.01em] text-pretty whitespace-pre-line text-fg-primary">{item.text}</p>
                  </blockquote>
                </div>
                <figcaption>
                  <Person item={item} />
                </figcaption>
              </figure>
            </li>
          ),
        )}
      </TestimonialCarousel>
    </section>
  );
}
