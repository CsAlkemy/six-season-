"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The Pixel counts the page it loaded on; this tells it about each page the shopper moves to after, as links don't
 * reload the page. GA4 follows browser history on its own (Enhanced measurement › Page changes, on by default).
 */
export function PixelPageViews() {
  const path = usePathname();
  const seen = useRef(path);
  useEffect(() => {
    if (seen.current === path) return;
    seen.current = path;
    window.fbq?.("track", "PageView");
  }, [path]);
  return null;
}
