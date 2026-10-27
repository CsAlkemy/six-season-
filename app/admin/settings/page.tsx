import { SettingsForm } from "@/components/admin/settings-form";
import { loadSettings } from "@/lib/data";

export default async function SettingsPage() {
  return (
    <>
      <h1 className="mb-6 text-h2">Settings</h1>
      <SettingsForm initial={await loadSettings()} />
    </>
  );
}
