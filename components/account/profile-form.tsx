"use client";

import { useState, useTransition } from "react";

import { updateProfile } from "@/app/[lang]/account/actions";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

interface Props {
  lang: Lang;
  name: string;
  address: string;
  hasPassword: boolean;
}

export function ProfileForm({ lang, hasPassword, ...initial }: Props) {
  const d = t(lang);
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const result = await updateProfile({ name, address, password }).catch(() => null);
      if (result?.ok) {
        setPassword("");
        setStatus({ ok: true, text: d.saved });
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
        <label htmlFor="profile-password" className="label">{hasPassword ? d.changePassword : d.setPassword}</label>
        <input
          id="profile-password"
          type="password"
          autoComplete="new-password"
          placeholder={d.newPassword}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
      </div>
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
