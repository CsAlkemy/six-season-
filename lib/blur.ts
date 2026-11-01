import { readFile } from "node:fs/promises";
import path from "node:path";

import { unstable_cache } from "next/cache";
import sharp from "sharp";

import type { Product } from "./types";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** The photo's bytes: from public/ for the bundled stand-ins and dev uploads, over HTTP for the Blob store. */
async function readPhoto(src: string): Promise<Buffer> {
  if (src.startsWith("/")) {
    const file = path.join(PUBLIC_DIR, src);
    if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new Error("Not a public file");
    return readFile(file);
  }
  const res = await fetch(src, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Photo answered ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** A 24px WebP of the photo as a data URI, a few hundred bytes. Scaled up by CSS it reads as the photo, blurred. */
async function makeBlur(src: string): Promise<string> {
  const tiny = await sharp(await readPhoto(src)).rotate().resize(24, 24, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${tiny.toString("base64")}`;
}

/** A photo's URL never changes its picture (uploads get a random suffix), so one render per URL is enough. */
const cachedBlur = unstable_cache(makeBlur, ["blur"]);

/** The placeholder for one photo, or null when it can't be read; failures aren't cached, so the next render retries. */
export async function blurOf(src: string): Promise<string | null> {
  try {
    return await cachedBlur(src);
  } catch {
    return null;
  }
}

/** Gives each product the placeholders for its photos, keyed by URL. Storefront reads only; never saved. */
export function withBlur(products: Product[]): Promise<Product[]> {
  return Promise.all(
    products.map(async (product) => {
      const urls = [...new Set([...(product.images ?? []), ...(product.image ? [product.image] : [])])];
      const blur: Record<string, string> = {};
      await Promise.all(
        urls.map(async (url) => {
          const uri = await blurOf(url);
          if (uri) blur[url] = uri;
        }),
      );
      return Object.keys(blur).length ? { ...product, blur } : product;
    }),
  );
}
