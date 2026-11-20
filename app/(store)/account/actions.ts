"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { maskEmail, resetEmail } from "@/lib/account-mail";
import {
  checkOtp,
  claimOrders,
  createReset,
  currentCustomer,
  endSession,
  findOrderByNo,
  forgetDeviceOrders,
  hashPassword,
  isAccount,
  loadCustomer,
  newCustomer,
  numberProven,
  openReset,
  passwordValid,
  rememberOrder,
  RESET_COOKIE,
  saveCustomer,
  sendOtp,
  spendReset,
  startSession,
} from "@/lib/customers";
import { EMAIL_ADDRESS, loadEmailConfig, sendEmail } from "@/lib/email";
import type { Dict } from "@/lib/i18n";
import { normalizeOrderNo } from "@/lib/orders";
import { normalizePhone } from "@/lib/pricing";
import { absolute } from "@/lib/site";
import { smsEnabled } from "@/lib/sms";
import { clientIp, withinLimit } from "@/lib/throttle";
import type { Customer, Lang } from "@/lib/types";

/** Errors are dictionary keys so the forms show them in the shopper's language. */
export type AuthError = keyof Dict & `err${string}`;
export type AuthResult = { ok: true } | { ok: false; error: AuthError };

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
/** Per connection, so one script can't make accounts or guess passwords by the thousand. */
const SIGNUPS_PER_IP_HOUR = 5;
const LOGINS_PER_IP_HOUR = 30;
const RESETS_PER_PHONE_HOUR = 3;
const RESETS_PER_IP_HOUR = 10;
const RESET_MINUTES = 30;

const clip = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const passwordOk = (password: string) => password.length >= 6 && password.length <= 100;
const langOf = (lang: unknown): Lang => (lang === "en" ? "en" : "bn");
/** "" (none) or a valid address, lower-cased. */
function emailOf(raw: unknown): string | null {
  const email = clip(raw, 120).toLowerCase();
  return !email || EMAIL_ADDRESS.test(email) ? email : null;
}
const allowed = (bucket: string, key: string, limit: number) => withinLimit(bucket, key, limit, 3_600_000).catch(() => true);

export async function requestCode(rawPhone: string, lang: Lang): Promise<AuthResult> {
  if (!smsEnabled()) return { ok: false, error: "errSms" };
  const phone = normalizePhone(clip(rawPhone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  try {
    const result = await sendOtp(phone, langOf(lang));
    if (result === "wait") return { ok: false, error: "errWait" };
    if (result === "sms") return { ok: false, error: "errSms" };
  } catch (error) {
    console.error("requestCode", error);
    return { ok: false, error: "errSms" };
  }
  return { ok: true };
}

/**
 * Proves the shopper owns the number (SMS) and signs them in. Used by checkout, code login and signup; signup also
 * passes a name, an email and a password.
 */
export async function verifyCode(input: { phone: string; code: string; name?: string; email?: string; password?: string }): Promise<AuthResult> {
  if (!smsEnabled()) return { ok: false, error: "errSms" };
  const phone = normalizePhone(clip(input?.phone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  const password = String(input.password ?? "");
  if (password && !passwordOk(password)) return { ok: false, error: "errPassword" };
  const email = emailOf(input.email);
  if (email === null) return { ok: false, error: "errEmail" };

  let customer: Customer;
  try {
    const check = await checkOtp(phone, clip(input.code, 10));
    if (check === "wrong") return { ok: false, error: "errCode" };
    if (check === "expired") return { ok: false, error: "errCodeExpired" };

    const saved = (await loadCustomer(phone)) ?? newCustomer(phone);
    customer = {
      ...saved,
      name: clip(input.name, 80) || saved.name,
      email: email || saved.email,
      password: password ? await hashPassword(password) : saved.password,
      phoneVerified: true,
      failedLogins: 0,
      lockedUntil: 0,
    };
    await saveCustomer(customer);
  } catch (error) {
    console.error("verifyCode", error);
    return { ok: false, error: "errSave" };
  }
  await startSession(customer);
  return { ok: true };
}

/**
 * A new account without SMS: name, mobile and password (an email too, for resets). Nothing proves the number, so the
 * account starts unproven and shows only its own orders (lib/customers.ts accessibleOrders). A number that already has
 * an account is refused; a guest's saved details on it are replaced, so a stranger can't read them by registering it.
 */
export async function signUp(input: { name: string; phone: string; email: string; password: string }): Promise<AuthResult> {
  // With SMS on, signing up goes through a code (verifyCode), which proves the number.
  if (smsEnabled()) return { ok: false, error: "errVerify" };
  const name = clip(input?.name, 80);
  const phone = normalizePhone(clip(input?.phone, 20));
  const email = emailOf(input?.email);
  const password = String(input?.password ?? "");
  if (!name) return { ok: false, error: "errRequired" };
  if (!phone) return { ok: false, error: "errPhone" };
  if (email === null) return { ok: false, error: "errEmail" };
  if (!passwordOk(password)) return { ok: false, error: "errPassword" };
  if (!(await allowed("signup-ip", await clientIp(), SIGNUPS_PER_IP_HOUR))) return { ok: false, error: "errTooMany" };

  let customer: Customer;
  try {
    const saved = await loadCustomer(phone);
    if (isAccount(saved)) return { ok: false, error: "errExists" };
    customer = {
      ...newCustomer(phone),
      createdAt: saved?.createdAt ?? new Date().toISOString(),
      name,
      ...(email ? { email } : {}),
      password: await hashPassword(password),
      phoneVerified: false,
      claimed: [],
    };
    await saveCustomer(customer);
  } catch (error) {
    console.error("signUp", error);
    return { ok: false, error: "errSave" };
  }
  await startSession(customer);
  return { ok: true };
}

export async function loginWithPassword(rawPhone: string, password: string): Promise<AuthResult> {
  const phone = normalizePhone(clip(rawPhone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  if (!(await allowed("login-ip", await clientIp(), LOGINS_PER_IP_HOUR))) return { ok: false, error: "errTooMany" };
  const customer = await loadCustomer(phone);
  const sms = smsEnabled();
  // No account on the number (or only a guest's saved details): sign up. With SMS on, a code-only account logs in by code.
  if (!isAccount(customer)) return { ok: false, error: customer && sms ? "errNoPassword" : "errNoAccount" };
  if ((customer.lockedUntil ?? 0) > Date.now()) return { ok: false, error: sms ? "errLocked" : "errLockedWait" };

  if (!(await passwordValid(String(password ?? "").slice(0, 100), customer.password))) {
    const failedLogins = (customer.failedLogins ?? 0) + 1;
    const locked = failedLogins >= LOCK_AFTER;
    await saveCustomer({
      ...customer,
      failedLogins: locked ? 0 : failedLogins,
      lockedUntil: locked ? Date.now() + LOCK_MINUTES * 60_000 : 0,
    }).catch(() => {});
    return { ok: false, error: locked ? (sms ? "errLocked" : "errLockedWait") : "errLogin" };
  }
  const fresh = customer.failedLogins ? { ...customer, failedLogins: 0 } : customer;
  if (fresh !== customer) await saveCustomer(fresh).catch(() => {});
  await startSession(fresh);
  return { ok: true };
}

export async function logout(form: FormData) {
  await Promise.all([endSession(), forgetDeviceOrders()]);
  redirect("/account");
}

export type ResetRequest = { ok: true; via: "email"; to: string } | { ok: true; via: "none" } | { ok: false; error: AuthError };

/**
 * "Forgot password": a one-time link to the account's email, when it has one and email is set up. Otherwise (or for a
 * number with no account, so this doesn't tell who has one) the shopper is pointed to the store's WhatsApp, where the
 * team can send a link to the number itself (Admin › Customers).
 */
export async function requestReset(input: { phone: string; lang: Lang }): Promise<ResetRequest> {
  const phone = normalizePhone(clip(input?.phone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  const lang = langOf(input?.lang);
  const [byPhone, byIp] = await Promise.all([allowed("reset-phone", phone, RESETS_PER_PHONE_HOUR), allowed("reset-ip", await clientIp(), RESETS_PER_IP_HOUR)]);
  if (!byPhone || !byIp) return { ok: false, error: "errTooMany" };

  const customer = await loadCustomer(phone).catch(() => null);
  const config = await loadEmailConfig().catch(() => null);
  if (!isAccount(customer) || !customer.email || !config?.apiKey) return { ok: true, via: "none" };
  try {
    const token = await createReset(phone, "email", lang, RESET_MINUTES);
    const sent = await sendEmail(config, resetEmail(lang, phone, absolute(`/r/${token}`), customer.email));
    // Resend refuses shoppers' addresses until the store's domain is verified there: fall back to WhatsApp.
    if (!sent.ok) return { ok: true, via: "none" };
  } catch (error) {
    console.error("requestReset", error);
    return { ok: true, via: "none" };
  }
  return { ok: true, via: "email", to: maskEmail(customer.email) };
}

/**
 * Sets the new password from a reset link (its token is in a cookie set by /r/[token], never in a page address). A
 * link sent on WhatsApp went to the number itself, so using it proves the number. Every other session ends.
 */
export async function resetPassword(input: { password: string }): Promise<AuthResult> {
  const jar = await cookies();
  const token = jar.get(RESET_COOKIE)?.value;
  const reset = await openReset(token);
  if (!token || !reset) return { ok: false, error: "errResetExpired" };
  const password = String(input?.password ?? "");
  if (!passwordOk(password)) return { ok: false, error: "errPassword" };

  let customer: Customer;
  try {
    // A link the team sent on WhatsApp can start an account for a number with nothing saved yet.
    const saved = (await loadCustomer(reset.phone)) ?? (reset.via === "whatsapp" ? newCustomer(reset.phone) : null);
    if (!saved) return { ok: false, error: "errResetExpired" };
    // A WhatsApp link proves the number. If it wasn't proven before, whoever registered it may not be this person:
    // their name, email (a later reset would go there), address and claimed orders go, and the owner starts clean.
    const takeover = reset.via === "whatsapp" && isAccount(saved) && !numberProven(saved);
    customer = {
      ...saved,
      ...(takeover ? { name: "", email: undefined, address: "", claimed: [] } : {}),
      password: await hashPassword(password),
      failedLogins: 0,
      lockedUntil: 0,
      phoneVerified: reset.via === "whatsapp" ? true : numberProven(saved),
    };
    await saveCustomer(customer);
    await spendReset(token);
  } catch (error) {
    console.error("resetPassword", error);
    return { ok: false, error: "errSave" };
  }
  jar.delete(RESET_COOKIE);
  await startSession(customer);
  return { ok: true };
}

/** An order by its number and the mobile it was placed with; this browser (and a signed-in account) can open it from then on. */
export async function trackOrder(input: { no: string; phone: string }): Promise<{ ok: true; no: string } | { ok: false; error: AuthError }> {
  const no = normalizeOrderNo(clip(input?.no, 40));
  if (!no) return { ok: false, error: "errTrack" };
  const phone = normalizePhone(clip(input?.phone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  try {
    const found = await findOrderByNo(no, phone);
    if (!found.ok) return found;
    await rememberOrder(found.order.id);
    const customer = await currentCustomer();
    if (isAccount(customer)) await claimOrders(customer, [found.order.id]);
  } catch (error) {
    console.error("trackOrder", error);
    return { ok: false, error: "errGeneric" };
  }
  return { ok: true, no };
}

/**
 * The signed-in shopper's details. A new password needs the current one (someone at an unlocked phone can't take the
 * account over), and signs out every other device; this one gets a fresh session.
 */
export async function updateProfile(input: { name: string; address: string; email: string; currentPassword: string; password: string }): Promise<AuthResult> {
  const customer = await currentCustomer();
  if (!customer) return { ok: false, error: "errVerify" };
  const name = clip(input?.name, 80);
  const address = clip(input?.address, 400);
  const email = emailOf(input?.email);
  const password = String(input?.password ?? "");
  if (!name) return { ok: false, error: "errRequired" };
  if (email === null) return { ok: false, error: "errEmail" };
  if (password && !passwordOk(password)) return { ok: false, error: "errPassword" };
  if (password && customer.password && !(await passwordValid(String(input?.currentPassword ?? "").slice(0, 100), customer.password))) {
    return { ok: false, error: "errCurrentPassword" };
  }

  let updated: Customer;
  try {
    updated = { ...customer, name, address, email: email || undefined, password: password ? await hashPassword(password) : customer.password };
    await saveCustomer(updated);
  } catch (error) {
    console.error("updateProfile", error);
    return { ok: false, error: "errSave" };
  }
  if (password) await startSession(updated);
  return { ok: true };
}
