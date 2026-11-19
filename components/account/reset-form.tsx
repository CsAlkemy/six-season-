"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resetPassword } from "@/app/[lang]/account/actions";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

import { PasswordField } from "./auth-forms";

/** After a reset link: the new password, then the shopper is signed in (and signed out everywhere else). */
export function ResetForm({ lang, phone }: { lang: Lang; phone: string }) {
  const d = t(lang);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError(d.errPassword);
    startTransition(async () => {
      const result = await resetPassword({ password }).catch(() => null);
      if (!result?.ok) return setError(d[result?.error ?? "errGeneric"]);
      router.replace(`/${lang}/account`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-6 sm:p-8">
      <div>
        <h2 className="text-h4">{d.newPasswordTitle}</h2>
        <p className="mt-1.5 text-body-sm text-fg-secondary tabular-nums">{d.newPasswordFor.replace("{phone}", phone)}</p>
      </div>
      <PasswordField d={d} label={d.newPassword} value={password} onChange={setPassword} autoComplete="new-password" hint={d.passwordHint} />
      {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? d.verifying : d.setPassword}</button>
    </form>
  );
}
