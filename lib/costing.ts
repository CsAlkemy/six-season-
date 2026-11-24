/**
 * What a product costs the store, and the prices that follow from it, for the admin's Costs & pricing card
 * (components/admin/product-form.tsx). The costs are kept encrypted in the vault (lib/product-costs.ts), never in
 * products.json, so no shopper can see them. This file has no secrets in it and runs in the browser too.
 */

/** One unit of one size, in taka: what it costs to buy (or make), and to pack. */
export interface SizeCost {
  buy: number;
  pack: number;
}

export interface ProductCosts {
  /** By size id. */
  sizes: Record<string, SizeCost>;
  /** Spent in a month promoting this product (Facebook boosts and the like), in taka. */
  marketing: number;
  /** Units expected to sell in a month, all sizes together; the marketing is shared out over them. */
  monthlyUnits: number;
  /** How much of the price to keep as profit, in percent. */
  targetMargin: number;
}

export const DEFAULT_TARGET_MARGIN = 30;
/** Past this the suggested price runs away (at 100% it would be infinite). */
export const MAX_TARGET_MARGIN = 90;

export const EMPTY_COSTS: ProductCosts = { sizes: {}, marketing: 0, monthlyUnits: 0, targetMargin: DEFAULT_TARGET_MARGIN };

/** The marketing each unit carries: the month's budget over the month's expected sales. Nothing until both are set. */
export const marketingPerUnit = (marketing: number, monthlyUnits: number) => (marketing > 0 && monthlyUnits > 0 ? marketing / monthlyUnits : 0);

export interface SizePricing {
  /** Buying, packing and marketing for one unit: selling at this breaks even. */
  cost: number;
  /** At the current price; null without one. */
  profit: number | null;
  /** Profit as a share of the current price (0.25 is 25%); null without a price. */
  margin: number | null;
  /** The price that keeps the target margin, rounded up to the next ৳10. */
  suggested: number;
}

/** Suggested prices end in 0, as the store's prices do. */
const roundUp = (amount: number) => Math.ceil(amount / 10) * 10;

/**
 * One size's numbers. Null until its buying price is in, so a half-filled row shows nothing rather than a profit
 * that isn't real. The margin is profit over price (not over cost): at a 30% margin, ৳30 of every ৳100 is profit.
 */
export function priceSize({ cost: size, marketing, price, targetMargin }: { cost: SizeCost; marketing: number; price: number; targetMargin: number }): SizePricing | null {
  if (!(size.buy > 0)) return null;
  const cost = size.buy + Math.max(size.pack, 0) + marketing;
  const target = Math.min(Math.max(targetMargin, 0), MAX_TARGET_MARGIN) / 100;
  return {
    cost,
    profit: price > 0 ? price - cost : null,
    margin: price > 0 ? (price - cost) / price : null,
    suggested: roundUp(cost / (1 - target)),
  };
}

/** True when there's nothing worth keeping: no cost typed in, no marketing, the default target. */
export const isEmptyCosts = (c: ProductCosts) =>
  c.marketing === 0 && c.monthlyUnits === 0 && c.targetMargin === DEFAULT_TARGET_MARGIN && Object.values(c.sizes).every((s) => s.buy === 0 && s.pack === 0);
