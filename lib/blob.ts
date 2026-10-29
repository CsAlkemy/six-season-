import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, get, list, put } from "@vercel/blob";

const hasToken = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Without a Blob token, `next dev` keeps everything in `.local-blob/` (JSON) and `public/local-uploads/` (photos),
 * both git-ignored, so the store and the admin work end to end on a laptop. Production never takes this path.
 */
const useLocal = () => !hasToken() && process.env.NODE_ENV !== "production";
const LOCAL_DIR = path.join(process.cwd(), ".local-blob");
const UPLOADS_DIR = path.join(process.cwd(), "public", "local-uploads");
const localFile = (pathname: string) => path.join(LOCAL_DIR, pathname);

/** True when saves can land somewhere: a Blob store, or the local folder in development. */
export const hasBlob = () => hasToken() || useLocal();

/** Latest content from origin, skipping the CDN, or null when it doesn't exist yet. */
export async function readJson<T>(pathname: string): Promise<T | null> {
  if (useLocal()) {
    try {
      return JSON.parse(await readFile(localFile(pathname), "utf8")) as T;
    } catch {
      return null;
    }
  }
  if (!hasToken()) return null;
  const res = await get(pathname, { access: "public", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return (await new Response(res.stream).json()) as T;
}

export async function writeJson(pathname: string, data: unknown): Promise<void> {
  if (useLocal()) {
    await mkdir(path.dirname(localFile(pathname)), { recursive: true });
    await writeFile(localFile(pathname), JSON.stringify(data));
    return;
  }
  if (!hasToken()) throw new Error("Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to save changes.");
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

/**
 * Every JSON blob under `prefix`, in key order. The upload time in the query string makes each
 * version its own CDN entry, so an overwritten blob is never served stale and repeat reads stay cached.
 */
export async function readAllJson<T>(prefix: string, limit: number, cursor?: string) {
  if (useLocal()) {
    const dir = localFile(prefix);
    const names = (await readdir(dir).catch(() => [] as string[])).filter((n) => n.endsWith(".json")).sort();
    const start = Number(cursor) || 0;
    const page = names.slice(start, start + limit);
    const items = await Promise.all(page.map(async (name) => JSON.parse(await readFile(path.join(dir, name), "utf8")) as T));
    return { items, cursor: start + limit < names.length ? String(start + limit) : undefined };
  }
  if (!hasToken()) return { items: [] as T[], cursor: undefined };
  const page = await list({ prefix, limit, cursor });
  const items = await Promise.all(
    page.blobs.map(async (blob) => {
      const res = await fetch(`${blob.url}?v=${blob.uploadedAt.getTime()}`);
      return (await res.json()) as T;
    }),
  );
  return { items, cursor: page.hasMore ? page.cursor : undefined };
}

/** Stores a photo and returns the URL the store shows it from. */
export async function putImage(folder: string, file: File): Promise<string> {
  const ext = (file.type.split("/")[1] ?? "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
  if (useLocal()) {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const name = `${folder}-${randomUUID().slice(0, 8)}.${ext}`;
    await writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
    return `/local-uploads/${name}`;
  }
  if (!hasToken()) throw new Error("Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to upload photos.");
  return (await put(`${folder}/photo.${ext}`, file, { access: "public", addRandomSuffix: true, contentType: file.type })).url;
}

/** Removes photos nothing uses any more. The bundled stand-ins under /images aren't uploads and stay. */
export async function deleteImages(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      try {
        if (url.startsWith("/local-uploads/")) await unlink(path.join(UPLOADS_DIR, path.basename(url)));
        else if (url.startsWith("https://") && hasToken()) await del(url);
      } catch {}
    }),
  );
}
