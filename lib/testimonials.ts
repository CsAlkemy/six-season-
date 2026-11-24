import type { Testimonial } from "./types";

/** saveStoreSettings keeps no more than this many. */
export const MAX_TESTIMONIALS = 12;
/** Kept short, so the words can be set big on the card (components/home/testimonials.tsx sizes them to fit). */
export const MAX_TESTIMONIAL_TEXT = 280;

/** What a phone records or a laptop exports; every browser plays MP4 (H.264). */
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_VIDEO_MB = 100;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

/** The ones the home page shows: switched on, with a name, and with their words or their video. */
export const shownTestimonials = (list: Testimonial[]) => list.filter((t) => t.enabled && t.name && (t.kind === "video" ? t.video : t.text));

/** One or two letters for someone without a photo. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
