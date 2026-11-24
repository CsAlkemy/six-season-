"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { ArrowRightIcon, PlayIcon } from "../icons";

/**
 * The feedback cards in a row that scrolls sideways and stops on a card: swiped on a phone, where the next card
 * peeks in, and stepped a frameful at a time by the round buttons from 640px up. The row runs the window's full
 * width while its first card, the place it stops a card, and the buttons keep to the page frame's edges (frame-inset
 * in globals.css), so on a screen wider than the frame the cards either side carry on to the window's edge. A
 * button shows only while there's more that way, so with everything in view there are none.
 */
export function TestimonialCarousel({ label, previous, next, children }: { label: string; previous: string; next: string; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState({ back: false, on: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const end = el.scrollWidth - el.clientWidth;
        setMore({ back: el.scrollLeft > 2, on: el.scrollLeft < end - 2 });
      });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, []);

  /** As many whole cards as fit in the frame, so the next frameful starts on a card. */
  const step = (by: -1 | 1) => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const style = getComputedStyle(el);
    const gap = parseFloat(style.columnGap) || 0;
    const frame = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const width = card.offsetWidth + gap;
    const cards = Math.max(1, Math.floor((frame + gap) / width));
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: by * cards * width, behavior: still ? "auto" : "smooth" });
  };

  const button = "absolute top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-border-strong bg-surface text-fg-primary shadow-hover transition-[opacity,background-color,border-color] hover:border-border-brand hover:bg-brand-soft max-sm:hidden";

  return (
    <div className="frame-inset relative">
      {/* Scrolls with the keyboard too, since written cards hold nothing to tab to. */}
      <ul
        ref={track}
        tabIndex={0}
        aria-label={label}
        className="flex snap-x snap-mandatory scroll-px-(--frame) justify-center-safe gap-4 overflow-x-auto overscroll-x-contain px-(--frame) py-3 [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <button type="button" aria-label={previous} onClick={() => step(-1)} tabIndex={more.back ? 0 : -1} className={`${button} left-(--frame) -translate-x-1/2 ${more.back ? "" : "pointer-events-none opacity-0"}`}>
        <ArrowRightIcon className="size-5 rotate-180" />
      </button>
      <button type="button" aria-label={next} onClick={() => step(1)} tabIndex={more.on ? 0 : -1} className={`${button} right-(--frame) translate-x-1/2 ${more.on ? "" : "pointer-events-none opacity-0"}`}>
        <ArrowRightIcon className="size-5" />
      </button>
    </div>
  );
}

/**
 * A video feedback card's player. Until it's played: the cover (or, without one, the video's own first frame), a
 * dark fade at the foot for the name, and a big play button over all of it. Nothing of the video loads before the tap
 * when there's a cover. Played, it fills the card with the phone's own controls, the whole frame in view; one card
 * playing pauses any other, and at the end the cover comes back.
 */
export function TestimonialVideo({ src, poster, label, children }: { src: string; poster: { src: string; srcSet?: string; sizes?: string } | null; label: string; children: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const play = () => {
    const el = video.current;
    if (!el) return;
    // Called from the tap itself, so phones let it play with sound.
    el.muted = false;
    void el.play().catch(() => {});
    setStarted(true);
    el.focus();
  };

  return (
    <>
      <video
        ref={video}
        data-feedback-video
        src={poster ? src : `${src}#t=0.1`}
        preload={poster ? "none" : "metadata"}
        playsInline
        controls={started}
        tabIndex={started ? 0 : -1}
        aria-hidden={!started}
        onPlay={() => {
          for (const other of document.querySelectorAll<HTMLVideoElement>("video[data-feedback-video]")) if (other !== video.current) other.pause();
        }}
        onEnded={() => setStarted(false)}
        className={`absolute inset-0 size-full bg-neutral-900 ${started ? "object-contain" : "object-cover"}`}
      />
      {!started && (
        <>
          {poster && <img {...poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-neutral-900/90 via-neutral-900/45 to-transparent" />
          <button type="button" onClick={play} aria-label={label} className="group/play absolute inset-0 grid place-items-center focus-visible:outline-none">
            <span className="grid size-18 place-items-center rounded-full bg-surface/90 text-fg-brand shadow-hover backdrop-blur-sm transition-transform duration-300 group-hover/play:scale-110 group-focus-visible/play:outline-2 group-focus-visible/play:outline-offset-4 group-focus-visible/play:outline-surface">
              <PlayIcon className="ml-1 size-8" />
            </span>
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-6">{children}</div>
        </>
      )}
    </>
  );
}
