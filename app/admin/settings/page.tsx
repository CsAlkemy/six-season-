import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { loadProducts, loadSettings } from "@/lib/data";
import { emailView } from "@/lib/email";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const { tab } = (await searchParams) as { tab?: string };
  const [settings, products, email] = await Promise.all([loadSettings(), loadProducts(), emailView()]);
  return <SettingsForm initialTab={tab} initial={settings} email={email} products={products.map((p) => ({ id: p.id, name: p.name, image: p.image, active: p.active }))} />;
}
