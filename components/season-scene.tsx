"use client";

import { useEffect, useRef } from "react";

import type { Stage } from "@/lib/season-scene";
import { SEASONS, type Season } from "@/lib/types";

/**
 * The season over the whole page: a WebGL sky and drifts behind the content, and a few near, soft ones in front of
 * it (under the header, never catching a click). three.js loads after the page is up, and the CSS sky gradient on
 * <body> stands in until it does, or for good where WebGL isn't available. It follows <html data-season data-motion>,
 * which the head script and the season picker set.
 */
export function SeasonScene() {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const season = () => (SEASONS.includes(html.dataset.season as Season) ? (html.dataset.season as Season) : "sheet");
    const motion = () => html.dataset.motion !== "off";
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
          s.setMotion(motion());
        }
        html.dataset.scene = "on";
        observer = new MutationObserver(() => {
          if (season() !== current) {
            current = season();
            stages.forEach((s) => s.setSeason(current));
          }
          stages.forEach((s) => s.setMotion(motion()));
        });
        observer.observe(html, { attributes: true, attributeFilter: ["data-season", "data-motion"] });
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
