/** Signed admin and customer session cookies. Web Crypto only, so it runs in the proxy and in server actions alike. */

export const SESSION_COOKIE = "mt_admin";
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

export async function sign(value: string): Promise<string> {
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

export const CUSTOMER_COOKIE = "mt_customer";
export const CUSTOMER_DAYS = 90;

/** `phone.expires.mac`: the phone was proven by an OTP or a password. */
export async function createCustomerSession(phone: string): Promise<string> {
  const expires = String(Date.now() + CUSTOMER_DAYS * 86_400_000);
  return `${phone}.${expires}.${await sign(`customer:${phone}:${expires}`)}`;
}

export async function verifyCustomerSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [phone, expires, mac] = token.split(".");
  if (!phone || !expires || !mac || Number(expires) < Date.now()) return null;
  return (await sign(`customer:${phone}:${expires}`)) === mac ? phone : null;
}
