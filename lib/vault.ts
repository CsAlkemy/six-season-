import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

import { readJson, writeJson } from "./blob";

/**
 * Settings that must stay private (API keys, the addresses alerts go to, courier tokens). The Blob store is public, so
 * unlike settings.json each one is AES-256-GCM encrypted with a key derived from ADMIN_SECRET: the file can be fetched,
 * but it reads as noise without the secret. Changing ADMIN_SECRET makes them unreadable; the admin says so and asks
 * for the keys again.
 */

interface Sealed {
  v: 1;
  iv: string;
  tag: string;
  data: string;
}

export type Opened<T> = { value: T | null; unreadable: boolean };

function vaultKey(): Buffer {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set ADMIN_SECRET to a random string of 32+ characters.");
  return Buffer.from(hkdfSync("sha256", secret, "matirtaan", "vault v1", 32));
}

/** A fixed path (not one derived from ADMIN_SECRET), so a changed secret shows up as unreadable rather than as nothing saved. */
const vaultPath = async (name: string) => `private/${name}.json`;

/** The stored value, null when nothing was saved, or `unreadable` when it can't be decrypted (ADMIN_SECRET changed). */
export async function openVault<T>(name: string): Promise<Opened<T>> {
  const sealed = await readJson<Sealed>(await vaultPath(name));
  if (!sealed?.data) return { value: null, unreadable: false };
  try {
    const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(sealed.iv, "base64"));
    decipher.setAAD(Buffer.from(name));
    decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
    const plain = Buffer.concat([decipher.update(Buffer.from(sealed.data, "base64")), decipher.final()]).toString("utf8");
    return { value: JSON.parse(plain) as T, unreadable: false };
  } catch (error) {
    console.error(`vault: can't read "${name}"`, error instanceof Error ? error.message : error);
    return { value: null, unreadable: true };
  }
}

/** Just the value; unreadable counts as nothing saved. */
export const readVault = async <T>(name: string) => (await openVault<T>(name)).value;

/** Saves a value; null clears it. */
export async function writeVault(name: string, value: unknown): Promise<void> {
  const path = await vaultPath(name);
  if (value === null) return writeJson(path, { v: 1, iv: "", tag: "", data: "" } satisfies Sealed);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  cipher.setAAD(Buffer.from(name));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  await writeJson(path, { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") } satisfies Sealed);
}

/** "re_•••• 4f2a": enough for the admin to recognise a key without the page ever holding it. */
export const maskSecret = (secret: string) => (secret ? `${secret.slice(0, Math.min(3, Math.floor(secret.length / 4)))}•••• ${secret.slice(-4)}` : "");
