import { get, list, put } from "@vercel/blob";

/** Without a token (local dev before linking a store) reads fall back to defaults and writes explain why. */
export const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Latest content from origin, skipping the CDN, or null when it doesn't exist yet. */
export async function readJson<T>(pathname: string): Promise<T | null> {
  if (!hasBlob()) return null;
  const res = await get(pathname, { access: "public", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return (await new Response(res.stream).json()) as T;
}

export async function writeJson(pathname: string, data: unknown): Promise<void> {
  if (!hasBlob()) throw new Error("Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to save changes.");
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
  if (!hasBlob()) return { items: [] as T[], cursor: undefined };
  const page = await list({ prefix, limit, cursor });
  const items = await Promise.all(
    page.blobs.map(async (blob) => {
      const res = await fetch(`${blob.url}?v=${blob.uploadedAt.getTime()}`);
      return (await res.json()) as T;
    }),
  );
  return { items, cursor: page.hasMore ? page.cursor : undefined };
}
