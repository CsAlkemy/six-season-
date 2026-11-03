/**
 * What shoppers do, sent to Google Analytics (GA4) and the Meta Pixel. components/analytics.tsx loads the tags only
 * when their IDs are set; without them window.gtag and window.fbq don't exist and every call here does nothing.
 * Only products, prices and the order number go out: never a name, phone number or address.
 */
export interface TrackedItem {
  id: string;
  name: string;
  /** The size's label. */
  variant: string;
  /** One unit, in taka. */
  price: number;
  qty: number;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const CURRENCY = "BDT";
const worth = (items: TrackedItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0);
const gaItems = (items: TrackedItem[]) => items.map((i) => ({ item_id: i.id, item_name: i.name, item_variant: i.variant, price: i.price, quantity: i.qty }));
const pixelItems = (items: TrackedItem[]) => ({
  content_type: "product",
  content_ids: items.map((i) => i.id),
  contents: items.map((i) => ({ id: i.id, quantity: i.qty, item_price: i.price })),
  num_items: items.reduce((n, i) => n + i.qty, 0),
  currency: CURRENCY,
});

/** One event, under the name each tool knows it by. A blocked or failing tag never gets in the shopper's way. */
function send(names: { ga: string; pixel: string }, ga: object, pixel: object, pixelOptions?: object) {
  try {
    window.gtag?.("event", names.ga, ga);
    window.fbq?.("track", names.pixel, pixel, ...(pixelOptions ? [pixelOptions] : []));
  } catch {}
}

/** A product page was opened. */
export const trackViewItem = (item: TrackedItem) =>
  send({ ga: "view_item", pixel: "ViewContent" }, { currency: CURRENCY, value: item.price, items: gaItems([item]) }, { ...pixelItems([item]), content_name: item.name, value: item.price });

/** Add to cart, or Buy now (which adds first). */
export const trackAddToCart = (item: TrackedItem) =>
  send({ ga: "add_to_cart", pixel: "AddToCart" }, { currency: CURRENCY, value: worth([item]), items: gaItems([item]) }, { ...pixelItems([item]), content_name: item.name, value: worth([item]) });

/** The checkout page opened with something in the cart. */
export const trackBeginCheckout = (items: TrackedItem[]) =>
  send({ ga: "begin_checkout", pixel: "InitiateCheckout" }, { currency: CURRENCY, value: worth(items), items: gaItems(items) }, { ...pixelItems(items), value: worth(items) });

/**
 * An order was placed. GA4 wants the goods' value with delivery apart; the Pixel wants what the shopper pays. The
 * order number is the Pixel's event ID, so the same order can't count twice if it's ever also sent from the server.
 */
export function trackPurchase(order: { no: string; items: TrackedItem[]; shipping: number }) {
  const goods = worth(order.items);
  send(
    { ga: "purchase", pixel: "Purchase" },
    { transaction_id: order.no, currency: CURRENCY, value: goods, shipping: order.shipping, items: gaItems(order.items) },
    { ...pixelItems(order.items), value: goods + order.shipping },
    { eventID: order.no },
  );
}
