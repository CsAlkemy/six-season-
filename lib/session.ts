/** Signed admin session cookie. Web Crypto only, so it runs in the proxy and in server actions alike. */

export const SESSION_COOKIE = "mt_admin";
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

async function sign(value: string): Promise<string> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set ADMIN_SECRET to a random string of 32+ characters.");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(mac))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!);
}

export async function createSession(): Promise<string> {
  const expires = String(Date.now() + SESSION_DAYS * 86_400_000);
  return `${expires}.${await sign(expires)}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expires, mac] = token.split(".");
  if (!expires || !mac || Number(expires) < Date.now()) return false;
  return (await sign(expires)) === mac;
}

/** Compares MACs rather than the raw strings, so timing says nothing about the password. */
export async function passwordMatches(input: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return (await sign(`pw:${input}`)) === (await sign(`pw:${password}`));
}
