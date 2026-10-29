"use server";

import { redirect } from "next/navigation";

import {
  checkOtp,
  currentPhone,
  endSession,
  hashPassword,
  loadCustomer,
  newCustomer,
  passwordValid,
  saveCustomer,
  sendOtp,
  startSession,
} from "@/lib/customers";
import type { Dict } from "@/lib/i18n";
import { normalizePhone } from "@/lib/pricing";
import type { Lang } from "@/lib/types";

/** Errors are dictionary keys so the forms show them in the shopper's language. */
export type AuthError = keyof Dict & `err${string}`;
export type AuthResult = { ok: true } | { ok: false; error: AuthError };

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

const clip = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const passwordOk = (password: string) => password.length >= 6 && password.length <= 100;

export async function requestCode(rawPhone: string, lang: Lang): Promise<AuthResult> {
  const phone = normalizePhone(clip(rawPhone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  try {
    const result = await sendOtp(phone, lang === "en" ? "en" : "bn");
    if (result === "wait") return { ok: false, error: "errWait" };
    if (result === "sms") return { ok: false, error: "errSms" };
  } catch (error) {
    console.error("requestCode", error);
    return { ok: false, error: "errSms" };
  }
  return { ok: true };
}

/**
 * Proves the shopper owns the number and signs them in. Used by checkout, code login and signup;
 * signup also passes a name and password, which is how a forgotten password gets reset too.
 */
export async function verifyCode(input: { phone: string; code: string; name?: string; password?: string }): Promise<AuthResult> {
  const phone = normalizePhone(clip(input?.phone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  const password = String(input.password ?? "");
  if (password && !passwordOk(password)) return { ok: false, error: "errPassword" };

  try {
    const check = await checkOtp(phone, clip(input.code, 10));
    if (check === "wrong") return { ok: false, error: "errCode" };
    if (check === "expired") return { ok: false, error: "errCodeExpired" };

    const customer = (await loadCustomer(phone)) ?? newCustomer(phone);
    const name = clip(input.name, 80);
    await saveCustomer({
      ...customer,
      name: name || customer.name,
      password: password ? await hashPassword(password) : customer.password,
      failedLogins: 0,
      lockedUntil: 0,
    });
  } catch (error) {
    console.error("verifyCode", error);
    return { ok: false, error: "errSave" };
  }
  await startSession(phone);
  return { ok: true };
}

export async function loginWithPassword(rawPhone: string, password: string): Promise<AuthResult> {
  const phone = normalizePhone(clip(rawPhone, 20));
  if (!phone) return { ok: false, error: "errPhone" };
  const customer = await loadCustomer(phone);
  if (!customer) return { ok: false, error: "errLogin" };
  if (!customer.password) return { ok: false, error: "errNoPassword" };
  if ((customer.lockedUntil ?? 0) > Date.now()) return { ok: false, error: "errLocked" };

  if (!(await passwordValid(String(password ?? "").slice(0, 100), customer.password))) {
    const failedLogins = (customer.failedLogins ?? 0) + 1;
    const locked = failedLogins >= LOCK_AFTER;
    await saveCustomer({
      ...customer,
      failedLogins: locked ? 0 : failedLogins,
      lockedUntil: locked ? Date.now() + LOCK_MINUTES * 60_000 : 0,
    }).catch(() => {});
    return { ok: false, error: locked ? "errLocked" : "errLogin" };
  }
  if (customer.failedLogins) await saveCustomer({ ...customer, failedLogins: 0 }).catch(() => {});
  await startSession(phone);
  return { ok: true };
}

export async function logout(form: FormData) {
  await endSession();
  redirect(`/${form.get("lang") === "en" ? "en" : "bn"}/account`);
}

export async function updateProfile(input: { name: string; address: string; password: string }): Promise<AuthResult> {
  const phone = await currentPhone();
  if (!phone) return { ok: false, error: "errVerify" };
  const name = clip(input?.name, 80);
  const address = clip(input?.address, 400);
  const password = String(input?.password ?? "");
  if (!name) return { ok: false, error: "errRequired" };
  if (password && !passwordOk(password)) return { ok: false, error: "errPassword" };

  try {
    const customer = (await loadCustomer(phone)) ?? newCustomer(phone);
    await saveCustomer({ ...customer, name, address, password: password ? await hashPassword(password) : customer.password });
  } catch (error) {
    console.error("updateProfile", error);
    return { ok: false, error: "errSave" };
  }
  return { ok: true };
}
