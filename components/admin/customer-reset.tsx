"use client";

import { useState, useTransition } from "react";

import { createResetLink } from "@/app/admin/actions";

import { toast } from "./controls";
import { Button, buttonClass, ContentCard } from "./ui";

/** Makes a reset link for the customer and opens WhatsApp to their number with it, ready to send. */
export function CustomerReset({ phone, hasAccount }: { phone: string; hasAccount: boolean }) {
  const [link, setLink] = useState<{ url: string; whatsapp: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, start] = useTransition();

  const create = () =>
    start(async () => {
      const r = await createResetLink(phone);
      if (!r.ok) return toast.error(r.error);
      setLink(r);
    });

  return (
    <ContentCard
      title={hasAccount ? "Password reset link" : "Start an account for them"}
      subtitle={`For a customer who asked on WhatsApp. Send it to ${phone} only: opening it lets them choose a new password and proves the number is theirs, so their account shows every order placed with it. It works once, for 24 hours.`}
    >
      {!link ? (
        <Button className="self-start" loading={busy} onClick={create}>Create link</Button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Reset link" className="field min-w-0 flex-1 font-mono text-body-sm" />
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(link.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>{copied ? "Copied" : "Copy"}</Button>
          </div>
          <a href={link.whatsapp} target="_blank" rel="noopener" className={buttonClass("primary", "default", "self-start")}>Send on WhatsApp to {phone}</a>
        </div>
      )}
    </ContentCard>
  );
}
