"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { loginWithPassword, requestCode, verifyCode, type AuthResult } from "@/app/[lang]/account/actions";
import { t } from "@/lib/i18n";
import { normalizePhone } from "@/lib/pricing";
import type { Lang } from "@/lib/types";

import { OtpField } from "../otp-field";

type Mode = "login" | "code" | "signup";

/** Log in with a password or an SMS code, or sign up (which always verifies the number by code). */
export function AuthForms({ lang }: { lang: Lang }) {
  const d = t(lang);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const switchTo = (next: Mode) => {
    setMode(next);
    setOtpPhone("");
    setCode("");
    setError("");
  };

  const done = (result: AuthResult | null) => {
    if (result?.ok) router.refresh();
    else setError(d[result?.error ?? "errGeneric"]);
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      if (mode === "login") return done(await loginWithPassword(phone, password).catch(() => null));
      if (mode === "signup" && !name.trim()) return setError(d.errRequired);
      if (mode === "signup" && password.length < 6) return setError(d.errPassword);
      if (!otpPhone) return sendCode();
      if (code.length !== 6) return setError(d.errCode);
      done(
        await verifyCode({ phone: otpPhone, code, ...(mode === "signup" && { name, password }) }).catch(() => null),
      );
    });
  };

  const verifying = otpPhone !== "";
  const busy = verifying || mode === "login" ? d.verifying : d.sending;

  return (
    <div className="card mx-auto max-w-md p-6 sm:p-8">
      <div className="mb-6 grid grid-cols-2 rounded-full bg-muted p-1" role="tablist">
        {(["login", "signup"] as const).map((tab) => {
          const active = tab === "signup" ? mode === "signup" : mode !== "signup";
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchTo(tab)}
              className={`rounded-full py-2.5 text-label transition-colors ${active ? "bg-surface text-fg-primary shadow-card" : "text-fg-secondary hover:text-fg-brand"}`}
            >
              {tab === "login" ? d.login : d.signup}
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        {verifying ? (
          <OtpField
            d={d}
            phone={otpPhone}
            value={code}
            onChange={setCode}
            disabled={pending}
            onResend={() => startTransition(sendCode)}
            onChangeNumber={() => {
              setOtpPhone("");
              setError("");
            }}
          />
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
              <input
                id="auth-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field"
              />
            </div>
            {mode !== "code" && (
              <div>
                <label htmlFor="auth-password" className="label">{d.password}</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                />
              </div>
            )}
          </>
        )}

        {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? busy : verifying ? d.verify : mode === "login" ? d.login : d.sendCode}
        </button>

        {mode !== "signup" && !verifying && (
          <button
            type="button"
            onClick={() => switchTo(mode === "login" ? "code" : "login")}
            className="w-full text-center text-body-sm text-fg-secondary underline hover:text-fg-brand"
          >
            {mode === "login" ? d.loginWithCode : d.loginWithPassword}
          </button>
        )}
      </form>
    </div>
  );
}
