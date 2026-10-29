"use client";

import { useEffect, useRef, useState } from "react";

import { MOTION_KEY, SEASON_KEY, SEASON_NAME, seasonAt } from "@/lib/season";
import { SEASONS, type Lang, type Season } from "@/lib/types";

import { CheckIcon, SeasonIcon } from "./icons";

type Choice = Season | "auto";
type Labels = { season: string; auto: string; today: string; animation: string };

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function savedChoice(): Choice {
  try {
    const saved = localStorage.getItem(SEASON_KEY);
    return SEASONS.includes(saved as Season) ? (saved as Season) : "auto";
  } catch {
    return "auto";
  }
}

/**
 * The header's season button: follow the calendar or pick a season, and turn the animation off. The head script
 * already set <html data-season data-motion> before paint, so the button reads those and CSS shows the right icon.
 */
export function SeasonPicker({ lang, labels }: { lang: Lang; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>("auto");
  const [motion, setMotion] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const html = () => document.documentElement;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setChoice(savedChoice());
      setMotion(html().dataset.motion !== "off");
    }
    setOpen(!open);
  };

  const pick = (next: Choice) => {
    setChoice(next);
    save(SEASON_KEY, next);
    html().dataset.season = next === "auto" ? seasonAt(Date.now()) : next;
  };

  const flip = () => {
    setMotion(!motion);
    save(MOTION_KEY, motion ? "off" : "on");
    html().dataset.motion = motion ? "off" : "on";
  };

  const today = seasonAt(Date.now());

  return (
    <div ref={root} className="sm:relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={labels.season}
        className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-label whitespace-nowrap transition-colors hover:bg-muted hover:text-fg-brand sm:px-4"
      >
        {SEASONS.map((s) => (
          <span key={s} data-season-only={s} className="inline-flex items-center gap-2">
            <SeasonIcon season={s} />
            <span className="hidden sm:inline">{SEASON_NAME[s][lang]}</span>
          </span>
        ))}
      </button>

      {open && (
        <div role="dialog" aria-label={labels.season} className="season-popover fixed inset-x-4 top-20 z-40 p-3 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-3 sm:w-88">
          <p className="px-2 pt-1 pb-2.5 text-overline text-fg-tertiary uppercase">{labels.season}</p>
          <div role="radiogroup" aria-label={labels.season} className="flex flex-col gap-2">
            <button type="button" role="radio" aria-checked={choice === "auto"} onClick={() => pick("auto")} className="season-option flex items-center gap-3 p-2.5 text-left">
              <span className="season-option-icon grid size-10 shrink-0 place-items-center rounded-xl">
                <SeasonIcon season={today} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label-md font-semibold">{labels.auto}</span>
                <span className="truncate text-caption text-fg-secondary first-letter:uppercase">
                  {labels.today} · {SEASON_NAME[today][lang]}
                </span>
              </span>
              <CheckIcon className="season-option-check size-5 shrink-0" />
            </button>
            <div className="grid grid-cols-3 gap-2">
              {SEASONS.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={choice === s} onClick={() => pick(s)} className="season-option flex min-w-0 flex-col items-center gap-1.5 px-1 py-3">
                  <SeasonIcon season={s} className="size-6" />
                  <span className="max-w-full truncate text-caption font-semibold whitespace-nowrap">{SEASON_NAME[s][lang]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-black/[0.035] px-3 py-2.5">
            <span id="season-motion" className="text-label-md font-semibold whitespace-nowrap">{labels.animation}</span>
            <button
              type="button"
              role="switch"
              aria-checked={motion}
              aria-labelledby="season-motion"
              onClick={flip}
              className="season-switch relative h-7 w-12 shrink-0 rounded-full transition-colors"
            >
              <span className={`absolute top-1 left-1 size-5 rounded-full bg-surface shadow-card transition-transform duration-300 ${motion ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
