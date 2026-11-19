import { randomBytes } from "node:crypto";

import { headers } from "next/headers";

import { listKeys, writeJson } from "./blob";
import { sign } from "./session";

/**
 * "At most `limit` tries per `windowMs`" for one key (a phone, an IP address). Blob has no counters that two requests
 * can't both read at once, so each try first leaves its own small file and only then counts the files: tries sent all
 * at the same moment see each other. Files are named newest first and sit under a keyed hash, so no number shows.
 */
export async function withinLimit(bucket: string, key: string, limit: number, windowMs: number): Promise<boolean> {
  const folder = `limits/${bucket}/${(await sign(`limit:${bucket}:${key}`)).slice(0, 32)}/`;
  const now = Date.now();
  await writeJson(`${folder}${String(1e13 - now).padStart(13, "0")}-${randomBytes(4).toString("hex")}.json`, { at: now });
  const recent = (await listKeys(folder, limit + 1)).filter((path) => 1e13 - Number(path.slice(folder.length, folder.length + 13)) > now - windowMs);
  return recent.length <= limit;
}

/** The visitor's address: Vercel sets x-forwarded-for to the client's own. */
export async function clientIp(): Promise<string> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
