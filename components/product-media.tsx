import { blurStyle } from "@/lib/blur-style";
import type { Lang, Product, Tone } from "@/lib/types";

import { LeafIcon } from "./icons";

const TONE: Record<Tone, string> = {
  butter: "bg-butter-100 text-butter-400",
  mustard: "bg-mustard-100 text-mustard-500",
  soil: "bg-soil-100 text-soil-400",
  leaf: "bg-leaf-50 text-leaf-400",
};

/** The product photo, or a tinted tile with its name until one is uploaded. */
export function ProductMedia({ product, lang, className = "" }: { product: Product; lang: Lang; className?: string }) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt={product.name[lang]}
        loading="lazy"
        style={blurStyle(product.blur?.[product.image])}
        className={`aspect-square w-full bg-muted object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`flex aspect-square w-full flex-col items-center justify-center gap-3 p-6 ${TONE[product.tone]} ${className}`} aria-hidden>
      <LeafIcon className="size-12" />
      <span className="text-center text-h4 text-fg-brand opacity-80">{product.name[lang]}</span>
    </div>
  );
}
