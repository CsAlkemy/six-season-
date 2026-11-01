import type { CSSProperties } from "react";

/** Paints a placeholder from lib/blur.ts behind a photo; the photo covers it once it has loaded. */
export const blurStyle = (uri?: string | null): CSSProperties | undefined =>
  uri ? { backgroundImage: `url("${uri}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
