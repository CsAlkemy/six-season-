"use client";

import { useEffect, useRef, useState } from "react";

import type { Stage } from "@/lib/season-scene";
import { paintSky, type StillSky } from "@/lib/season-sky";
import { SEASONS, type Season } from "@/lib/types";

/** As long as the canvases' CSS fade, so switching off lets the sky fade out before it's taken down. */
const FADE_MS = 1200;

const seasonNow = () => {
  const s = document.documentElement.dataset.season;
  return SEASONS.includes(s as Season) ? (s as Season) : "sheet";
};

/**
 * The season over the whole page. Always: its sky, sun, clouds and fog, painted once behind the content (StillSky,
 * no three.js, no animation frames). With the animation switched on in the season picker (<html data-motion="on">):
 * three.js's moving scene fades in over it, the sky drifting and the season's leaves, petals or rain falling behind
 * the content and a few in front. Switching off fades the moving scene out to the still sky and frees its GPU, so the
 * page costs what it did before.
 */
export function SeasonScene() {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const read = () => setOn(html.dataset.motion === "on");
    read();
    const observer = new MutationObserver(read);
    observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (on) return setMounted(true);
    // Fade out first, then take the canvases down; switching back on meanwhile keeps them.
    const timer = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(timer);
  }, [on]);

  return (
    <>
      <Still />
      {mounted && <Scene visible={on} />}
    </>
  );
}

/**
 * The still sky. Painted once the page has loaded and the browser is idle, so it never holds up the first paint or
 * the product photos; it fades in over the CSS gradient, which is the same sky's colours. Repainted only when the
 * season or the window size changes.
 */
function Still() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    let sky: StillSky | null = null;
    let observer: MutationObserver | undefined;
    const paint = () => {
      if (!canvas.current) return;
      let current = seasonNow();
      sky = paintSky(canvas.current, current);
      if (!sky) return;
      html.dataset.sky = "on";
      observer = new MutationObserver(() => {
        if (seasonNow() === current) return;
        current = seasonNow();
        sky?.setSeason(current);
      });
      observer.observe(html, { attributes: true, attributeFilter: ["data-season"] });
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    let handle = 0;
    const start = () => (handle = idle(paint, { timeout: 2000 }) as number);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      cancelIdle(handle);
      observer?.disconnect();
      sky?.dispose();
      delete html.dataset.sky;
    };
  }, []);

  return <canvas ref={canvas} className="season-canvas season-canvas-still" aria-hidden />;
}

/** The two canvases, from the moment the animation is switched on until it has faded out after being switched off. */
function Scene({ visible }: { visible: boolean }) {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  // The canvases fade in once three.js has drawn, and out as soon as the animation is switched off (CSS, data-scene).
  useEffect(() => {
    const html = document.documentElement;
    if (ready && visible) html.dataset.scene = "on";
    else delete html.dataset.scene;
  }, [ready, visible]);

  useEffect(() => {
    const html = document.documentElement;
    let stages: Stage[] = [];
    let observer: MutationObserver | undefined;
    let cancelled = false;

    import("@/lib/season-scene")
      .then(({ createStage }) => {
        if (cancelled || !back.current || !front.current) return;
        stages = [createStage(back.current, false), createStage(front.current, true)];
        let current = seasonNow();
        for (const s of stages) {
          s.setSeason(current, true);
          s.setMotion(true);
        }
        setReady(true);
        observer = new MutationObserver(() => {
          if (seasonNow() === current) return;
          current = seasonNow();
          stages.forEach((s) => s.setSeason(current));
        });
        observer.observe(html, { attributes: true, attributeFilter: ["data-season"] });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      observer?.disconnect();
      stages.forEach((s) => s.dispose());
      delete html.dataset.scene;
    };
  }, []);

  return (
    <>
      <canvas ref={back} className="season-canvas season-canvas-back" aria-hidden />
      <canvas ref={front} className="season-canvas season-canvas-front" aria-hidden />
    </>
  );
}
