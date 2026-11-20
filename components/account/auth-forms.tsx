"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { type AuthResult, loginWithPassword, requestCode, requestReset, signUp, verifyCode } from "@/app/(store)/account/actions";
import { type Dict, t } from "@/lib/i18n";
import { normalizePhone } from "@/lib/pricing";
import type { Lang } from "@/lib/types";

import { OtpField } from "../otp-field";

type Mode = "login" | "code" | "signup" | "forgot";

/** A password box with Show / Hide, which phones need more than a second "confirm password" box. */
export function PasswordField({ d, label, value, onChange, autoComplete, hint }: { d: Dict; label: string; value: string; onChange: (value: string) => void; autoComplete: string; hint?: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} type={shown ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="field pr-20" />
        <button type="button" onClick={() => setShown(!shown)} aria-pressed={shown} className="absolute inset-y-0 right-0 px-4 text-body-sm font-semibold text-fg-secondary hover:text-fg-brand">
          {shown ? d.hide : d.show}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-body-sm text-fg-tertiary">{hint}</p>}
    </div>
  );
}

/**
 * Log in or sign up with a mobile number and password, and get a reset link when the password's forgotten. With SMS
 * on (`sms`), signing up proves the number by code and logging in by code is offered too. `next` is where to go after.
 */
export function AuthForms({ lang, sms, next, start = "login", whatsapp, phone: storePhone }: {
  lang: Lang;
  sms: boolean;
  next?: string;
  start?: "login" | "signup";
  /** The store's WhatsApp (8801…), for a reset when there's no email; "" hides the button. */
  whatsapp: string;
  /** The store's phone, the fallback when there's no WhatsApp. */
  phone: string;
}) {
  const d = t(lang);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(start);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ text: string; whatsapp?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const switchTo = (to: Mode) => {
    setMode(to);
    setOtpPhone("");
    setCode("");
    setError("");
    setNotice(null);
  };

  const done = (result: AuthResult | null) => {
    if (!result?.ok) return setError(d[result?.error ?? "errGeneric"]);
    if (next) router.push(next);
    router.refresh();
  };

  const sendCode = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) return setError(d.errPhone);
    const result = await requestCode(normalized, lang).catch(() => null);
    if (result?.ok) {
      setOtpPhone(normalized);
      setCode("");
    } else setError(d[result?.error ?? "errSms"]);
  };

  const forgot = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) return setError(d.errPhone);
    const result = await requestReset({ phone: normalized, lang }).catch(() => null);
    if (!result?.ok) return setError(d[result?.error ?? "errGeneric"]);
    if (result.via === "email") return setNotice({ text: d.resetSent.replace("{email}", result.to) });
    const text = `${d.resetWhatsAppText} ${normalized}`;
    setNotice(whatsapp ? { text: d.resetNoEmail, whatsapp: `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}` } : { text: `${d.resetNoEmailCall}${storePhone ? ` ${storePhone}` : ""}` });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      if (mode === "login") return done(await loginWithPassword(phone, password).catch(() => null));
      if (mode === "forgot") return forgot();
      if (mode === "signup") {
        if (!name.trim()) return setError(d.errRequired);
        if (!normalizePhone(phone)) return setError(d.errPhone);
        if (password.length < 6) return setError(d.errPassword);
        if (!sms) return done(await signUp({ name, phone, email, password }).catch(() => null));
      }
      // With SMS: a code first, for code login and for signup.
      if (!otpPhone) return sendCode();
      if (code.length !== 6) return setError(d.errCode);
      done(await verifyCode({ phone: otpPhone, code, ...(mode === "signup" && { name, email, password }) }).catch(() => null));
    });
  };

  const verifying = otpPhone !== "";
  const label = pending
    ? mode === "signup" && !sms ? d.creating : mode === "forgot" || (!verifying && mode !== "login") ? d.sending : d.verifying
    : verifying ? d.verify : mode === "login" ? d.login : mode === "forgot" ? d.sendResetLink : mode === "signup" && !sms ? d.createAccount : d.sendCode;
  const linkClass = "text-body-sm text-fg-secondary underline underline-offset-4 hover:text-fg-brand";

  return (
    <div className="card p-6 sm:p-8">
      {mode === "forgot" ? (
        <div className="mb-5">
          <h2 className="text-h4">{d.resetTitle}</h2>
          <p className="mt-1.5 text-body-sm text-fg-secondary">{d.resetLead}</p>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 rounded-full bg-muted p-1" role="tablist">
          {(["login", "signup"] as const).map((tab) => {
            const active = tab === "signup" ? mode === "signup" : mode !== "signup";
            return (
              <button key={tab} type="button" role="tab" aria-selected={active} onClick={() => switchTo(tab)} className={`rounded-full py-2.5 text-label transition-colors ${active ? "bg-surface text-fg-primary shadow-card" : "text-fg-secondary hover:text-fg-brand"}`}>
                {tab === "login" ? d.login : d.signup}
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        {verifying ? (
          <OtpField d={d} phone={otpPhone} value={code} onChange={setCode} disabled={pending} onResend={() => startTransition(sendCode)} onChangeNumber={() => { setOtpPhone(""); setError(""); }} />
        ) : (
          <>
            {mode === "signup" && (
              <div>
                <label htmlFor="auth-name" className="label">{d.name}</label>
                <input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" />
              </div>
            )}
            <div>
              <label htmlFor="auth-phone" className="label">{d.phone}</label>
              <input id="auth-phone" type="tel" inputMode="tel" autoComplete={mode === "signup" ? "tel" : "username"} placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" />
            </div>
            {mode === "signup" && (
              <div>
                <label htmlFor="auth-email" className="label">{d.emailOptional}</label>
                <input id="auth-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
                <p className="mt-1.5 text-body-sm text-fg-tertiary">{d.emailHint}</p>
              </div>
            )}
            {(mode === "login" || mode === "signup") && (
              <PasswordField d={d} label={d.password} value={password} onChange={setPassword} autoComplete={mode === "signup" ? "new-password" : "current-password"} hint={mode === "signup" ? d.passwordHint : undefined} />
            )}
            {mode === "login" && (
              <div className="-mt-1 text-right">
                <button type="button" onClick={() => switchTo("forgot")} className={linkClass}>{d.forgotPassword}</button>
              </div>
            )}
          </>
        )}

        {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
        {notice && (
          <div className="space-y-3 rounded-md bg-sage-soft p-3 text-body-sm text-fg-sage" role="status">
            <p>{notice.text}</p>
            {notice.whatsapp && <a href={notice.whatsapp} target="_blank" rel="noopener" className="btn-secondary h-11 px-5 text-label-md">{d.whatsapp}</a>}
          </div>
        )}
        {!(mode === "forgot" && notice) && (
          <button type="submit" disabled={pending} className="btn-primary w-full">{label}</button>
        )}

        <div className="flex flex-col items-center gap-3 pt-1">
          {mode === "forgot" && <button type="button" onClick={() => switchTo("login")} className={linkClass}>{d.backToLogin}</button>}
          {mode === "forgot" && sms && <p className="text-center text-body-sm text-fg-tertiary">{d.resetSmsHint}</p>}
          {sms && (mode === "login" || mode === "code") && !verifying && (
            <button type="button" onClick={() => switchTo(mode === "login" ? "code" : "login")} className={linkClass}>
              {mode === "login" ? d.loginWithCode : d.loginWithPassword}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
