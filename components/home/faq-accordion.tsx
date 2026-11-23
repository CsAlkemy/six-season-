"use client";

import { type ReactNode, useEffect, useRef } from "react";

const DURATION = 320;
const EASING = "cubic-bezier(0.2, 0.7, 0.2, 1)";

/**
 * The FAQ's cards opening and closing smoothly: a card grows to fit its answer as the answer fades in, and shrinks
 * back as it fades out. Until this runs they're plain <details>, one open at a time by their shared name. Once it
 * runs it keeps one open at a time itself, so the card that closes as another opens shrinks too instead of snapping
 * shut. With reduced motion the cards just open and close.
 *
 * While a card shrinks it's still [open] (its answer has to stay there to be seen going), so it carries
 * data-closing, and the open card's colours and turned plus (globals.css, .faq-item) let go when it starts.
 */
export function FaqAccordion({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLDetailsElement>(":scope > details"));
    const names = items.map((details) => details.getAttribute("name"));
    for (const details of items) details.removeAttribute("name");
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const running = new Map<HTMLDetailsElement, Animation[]>();

    const settle = (details: HTMLDetailsElement) => {
      for (const animation of running.get(details) ?? []) animation.cancel();
      running.delete(details);
      details.style.overflow = "";
      details.removeAttribute("data-closing");
    };

    const set = (details: HTMLDetailsElement, open: boolean) => {
      const answer = details.querySelector<HTMLElement>(".faq-answer");
      if (!motion.matches) {
        settle(details);
        details.open = open;
        return;
      }
      // Measured before the running animation stops, so a card turned back halfway goes on from where it is.
      const from = details.offsetHeight;
      const opacity = answer && details.open ? Number(getComputedStyle(answer).opacity) : 0;
      settle(details);
      details.open = open;
      const to = details.offsetHeight;
      details.open = true;
      details.toggleAttribute("data-closing", !open);
      details.style.overflow = "clip";
      const height = details.animate({ height: [`${from}px`, `${to}px`] }, { duration: DURATION, easing: EASING });
      const fade = answer?.animate(
        open ? { opacity: [opacity, 1], translate: ["0 -0.5rem", "0 0"] } : { opacity: [opacity, 0] },
        { duration: open ? DURATION : DURATION * 0.6, easing: EASING, fill: "forwards" },
      );
      running.set(details, fade ? [height, fade] : [height]);
      height.onfinish = () => {
        settle(details);
        if (!open) details.open = false;
      };
    };

    const onClick = (event: MouseEvent) => {
      const summary = (event.target as Element).closest("summary");
      const details = summary?.parentElement;
      if (!(details instanceof HTMLDetailsElement) || details.parentElement !== root) return;
      event.preventDefault();
      const opening = !details.open || details.hasAttribute("data-closing");
      if (opening) {
        for (const other of items) if (other !== details && other.open && !other.hasAttribute("data-closing")) set(other, false);
      }
      set(details, opening);
    };

    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
      items.forEach((details, i) => {
        const closing = details.hasAttribute("data-closing");
        settle(details);
        if (closing) details.open = false;
        const name = names[i];
        if (name) details.setAttribute("name", name);
      });
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
