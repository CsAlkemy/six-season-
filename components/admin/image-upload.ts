import { uploadImage } from "@/app/admin/actions";

const MAX_SIDE = 1400;

/** Shrinks a photo to WebP in the browser, so uploads are small and the store stays fast. */
async function toWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  return blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
}

/** Resizes then uploads; resolves to the public URL or an error message. */
export async function uploadPhoto(file: File, folder: "products" | "home"): Promise<{ url: string } | { error: string }> {
  const form = new FormData();
  form.set("file", await toWebp(file));
  form.set("folder", folder);
  return uploadImage(form);
}
