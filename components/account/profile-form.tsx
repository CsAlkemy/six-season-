"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateProfile } from "@/app/[lang]/account/actions";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

import { PasswordField } from "./auth-forms";

interface Props {
  lang: Lang;
  name: string;
  address: string;
  email: string;
  hasPassword: boolean;
}

/** Name, address and email, and the password: changing it asks for the current one and signs other devices out. */
export function ProfileForm({ lang, hasPassword, ...initial }: Props) {
  const d = t(lang);
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [email, setEmail] = useState(initial.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const result = await updateProfile({ name, address, email, currentPassword, password }).catch(() => null);
      if (result?.ok) {
        setPassword("");
        setCurrentPassword("");
        setStatus({ ok: true, text: d.saved });
        router.refresh();
      } else setStatus({ ok: false, text: d[result?.error ?? "errSave"] });
    });
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-6">
      <h2 className="text-h4">{d.profile}</h2>
      <div>
        <label htmlFor="profile-name" className="label">{d.name}</label>
        <input id="profile-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" />
      </div>
      <div>
        <label htmlFor="profile-address" className="label">{d.address}</label>
        <textarea id="profile-address" rows={3} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} className="field" />
      </div>
      <div>
        <label htmlFor="profile-email" className="label">{d.emailOptional}</label>
        <input id="profile-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        <p className="mt-1.5 text-body-sm text-fg-tertiary">{d.emailHint}</p>
      </div>
      <fieldset className="space-y-4 border-t border-border pt-4">
        <legend className="sr-only">{hasPassword ? d.changePassword : d.setPassword}</legend>
        {hasPassword && <PasswordField d={d} label={d.currentPassword} value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />}
        <PasswordField d={d} label={hasPassword ? d.changePassword : d.setPassword} value={password} onChange={setPassword} autoComplete="new-password" hint={hasPassword ? d.passwordChangeNote : d.passwordHint} />
      </fieldset>
      {status && (
        <p role="status" className={`rounded-md p-3 text-body-sm ${status.ok ? "bg-sage-soft text-fg-sage" : "bg-error-soft text-fg-error"}`}>
          {status.text}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-secondary w-full">
        {d.save}
      </button>
    </form>
  );
}
