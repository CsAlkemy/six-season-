import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { loadProducts, loadSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const { tab } = (await searchParams) as { tab?: string };
  const [settings, products] = await Promise.all([loadSettings(), loadProducts()]);
  return <SettingsForm initialTab={tab} initial={settings} products={products.map((p) => ({ id: p.id, name: p.name, image: p.image, active: p.active }))} />;
}
