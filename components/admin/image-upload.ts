import { uploadImage } from "@/app/admin/actions";

type Folder = "products" | "home" | "blog";

/** Longest side kept: the home page's banner spans the page, so it keeps more than a product or post photo. */
const MAX_SIDE: Record<Folder, number> = { products: 1400, blog: 1400, home: 2400 };

/** Shrinks a photo to WebP in the browser, so uploads are small and the store stays fast. */
async function toWebp(file: File, maxSide: number): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  return { file: blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file, width: canvas.width, height: canvas.height };
}

/** Resizes then uploads; resolves to the public URL and the size it was saved at, or an error message. `maxSide` is for a photo shown small (a customer's face). */
export async function uploadPhoto(file: File, folder: Folder, maxSide = MAX_SIDE[folder]): Promise<{ url: string; width: number; height: number } | { error: string }> {
  const { file: webp, width, height } = await toWebp(file, maxSide);
  const form = new FormData();
  form.set("file", webp);
  form.set("folder", folder);
  const result = await uploadImage(form);
  return "url" in result ? { ...result, width, height } : result;
}
