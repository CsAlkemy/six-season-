import type { Lang, Text } from "@/lib/types";

/**
 * A product's Bangla name under its English one. The store is in English, but people know these foods, ask for them
 * and search for them by their Bangla names (গাওয়া ঘি, খেজুরের গুড়), so the name they'd say is there too.
 */
export function BanglaName({ name, lang, className = "" }: { name: Text; lang: Lang; className?: string }) {
  if (lang === "bn" || !name.bn || name.bn === name.en) return null;
  return (
    <span lang="bn" className={`block font-display ${className}`}>
      {name.bn}
    </span>
  );
}
