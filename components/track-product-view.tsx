"use client";

import { useEffect } from "react";

import { trackViewItem, type TrackedItem } from "@/lib/analytics";

/** Shows nothing: tells analytics this product page was opened (its default size and price). */
export function TrackProductView({ item }: { item: Omit<TrackedItem, "qty"> }) {
  const { id, name, variant, price } = item;
  useEffect(() => {
    trackViewItem({ id, name, variant, price, qty: 1 });
  }, [id, name, variant, price]);
  return null;
}
