import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { loadProducts, loadSettings } from "@/lib/data";
import { couriersView } from "@/lib/couriers";
import { emailView } from "@/lib/email";

/** Connecting a courier checks its keys with it, and Pathao can take 20 seconds to log in. Server actions take their time limit from the page (seconds; 60 is allowed on every Vercel plan). */
export const maxDuration = 60;

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const { tab } = (await searchParams) as { tab?: string };
  const [settings, products, email, couriers] = await Promise.all([loadSettings(), loadProducts(), emailView(), couriersView()]);
  return <SettingsForm initialTab={tab} initial={settings} email={email} couriers={couriers} products={products.map((p) => ({ id: p.id, name: p.name, image: p.image, active: p.active }))} />;
}
