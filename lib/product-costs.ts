import { isEmptyCosts, type ProductCosts } from "./costing";
import { readVault, writeVault } from "./vault";

/**
 * Every product's costs, by product id, as one encrypted vault entry (lib/vault.ts): products.json is public, and a
 * buying price is the store's own business. Server only; the admin's product page reads them for its form.
 */
const VAULT = "costs";
type AllCosts = Record<string, ProductCosts>;

export async function loadProductCosts(id: string): Promise<ProductCosts | null> {
  return (await readVault<AllCosts>(VAULT))?.[id] ?? null;
}

/** Keeps one product's costs; null, or nothing filled in, removes them. Writes nothing when they haven't changed. */
export async function saveProductCosts(id: string, costs: ProductCosts | null): Promise<void> {
  const all = (await readVault<AllCosts>(VAULT)) ?? {};
  const next = costs && !isEmptyCosts(costs) ? costs : undefined;
  if (JSON.stringify(all[id]) === JSON.stringify(next)) return;
  const others = Object.fromEntries(Object.entries(all).filter(([key]) => key !== id));
  await writeVault(VAULT, next ? { ...others, [id]: next } : others);
}
