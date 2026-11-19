"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { trackOrder } from "@/app/[lang]/account/actions";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/**
 * An order by its number and the mobile it was placed with: how a guest gets back to an order from another phone or
 * browser. On the account page it opens the order; in the review box (`onFound`) it lets them review what came.
 */
export function TrackForm({ lang, onFound, lead }: { lang: Lang; onFound?: () => void; lead?: string }) {
  const d = t(lang);
  const router = useRouter();
  const id = useId();
  const [no, setNo] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!no.trim() || !phone.trim()) return setError(d.errRequired);
    startTransition(async () => {
      const result = await trackOrder({ no, phone }).catch(() => null);
      if (!result?.ok) return setError(d[result?.error ?? "errGeneric"]);
      if (onFound) onFound();
      else router.push(`/${lang}/account?order=${result.no}`);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-body-sm text-fg-secondary">{lead ?? d.trackLead}</p>
      <div>
        <label htmlFor={`${id}-no`} className="label">{d.orderNo}</label>
        <input id={`${id}-no`} autoComplete="off" autoCapitalize="characters" placeholder="MT-XXXXXX-XXXX" value={no} onChange={(e) => setNo(e.target.value)} className="field uppercase" />
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="label">{d.phone}</label>
        <input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" />
      </div>
      {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? d.finding : d.findOrder}</button>
    </form>
  );
}
