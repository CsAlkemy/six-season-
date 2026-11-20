import { getImageProps } from "next/image";

/**
 * Photos uploaded from the admin (Vercel Blob's products/, blog/ and home/ folders; public/ locally) are up to 1400px.
 * These are offered to the browser in smaller sizes too, made and cached by Vercel's image optimizer, so a phone
 * downloads one near the size it shows. Anything else (a pasted link in a post, an SVG) is left as it is.
 */
const RESIZABLE = /^(https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/(products|blog|home)\/|\/(local-uploads|images)\/)[^?#]+\.(webp|jpe?g|png|avif)$/i;

/** How wide the photo shows: a product card in the grid (1 column on phones, up to 4 at 1280px+ in a 1440px page). */
export const CARD_SIZES = "(min-width: 1280px) 310px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw";
/** The product page's main photo: full width on phones, the left half beside the buy box from 1024px. */
export const PRODUCT_SIZES = "(min-width: 1440px) 680px, (min-width: 1024px) 48vw, 100vw";

/** `src`, plus `srcSet` and `sizes` when the photo can be resized. Spread onto an <img>. */
export function sized(src: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!RESIZABLE.test(src)) return { src };
  const { props } = getImageProps({ src, alt: "", width: 1400, height: 1400, sizes });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}
