import { uploadImage } from "@/app/admin/actions";

const MAX_SIDE = 1400;

/** Shrinks a photo to WebP in the browser, so uploads are small and the store stays fast. */
async function toWebp(file: File): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  return { file: blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file, width: canvas.width, height: canvas.height };
}

/** Resizes then uploads; resolves to the public URL and the size it was saved at, or an error message. */
export async function uploadPhoto(file: File, folder: "products" | "home" | "blog"): Promise<{ url: string; width: number; height: number } | { error: string }> {
  const { file: webp, width, height } = await toWebp(file);
  const form = new FormData();
  form.set("file", webp);
  form.set("folder", folder);
  const result = await uploadImage(form);
  return "url" in result ? { ...result, width, height } : result;
}
