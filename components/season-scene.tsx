"use client";

import { useEffect, useRef, useState } from "react";

import type { Stage } from "@/lib/season-scene";
import { SEASONS, type Season } from "@/lib/types";

/** As long as the canvases' CSS fade, so switching off lets the sky fade out before it's taken down. */
const FADE_MS = 1200;

/**
 * The season over the whole page: a WebGL sky and drifts behind the content, and a few near, soft ones in front of it.
 * It's off unless the visitor switches the animation on in the season picker (<html data-motion="on">): until then
 * nothing loads, and the CSS sky gradient on <html> is the sky. Switching on loads three.js and fades the scene in;
 * switching off fades it out and frees the GPU, so a visitor who turns it off gets a page that costs what it did before.
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

  return mounted ? <Scene visible={on} /> : null;
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
    const season = () => (SEASONS.includes(html.dataset.season as Season) ? (html.dataset.season as Season) : "sheet");
    let stages: Stage[] = [];
    let observer: MutationObserver | undefined;
    let cancelled = false;

    import("@/lib/season-scene")
      .then(({ createStage }) => {
        if (cancelled || !back.current || !front.current) return;
        stages = [createStage(back.current, false), createStage(front.current, true)];
        let current = season();
        for (const s of stages) {
          s.setSeason(current, true);
          s.setMotion(true);
        }
        setReady(true);
        observer = new MutationObserver(() => {
          if (season() === current) return;
          current = season();
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
