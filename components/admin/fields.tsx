"use client";

import { useId } from "react";

import type { Text } from "@/lib/types";

import { FormField } from "./ui";

/** A labelled text or number input whose label is wired to it. */
export function Input({ label, value, onChange, type = "text", placeholder, hint, prefix, error, autoFocus, inputMode }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: React.ReactNode;
  prefix?: string;
  error?: React.ReactNode;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        {prefix && <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-tertiary">{prefix}</span>}
        <input id={id} type={type} inputMode={inputMode} min={type === "number" ? 0 : undefined} autoFocus={autoFocus} value={value} placeholder={placeholder} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value)} className={prefix ? "field pl-9" : "field"} />
      </div>
    </FormField>
  );
}

export function TextArea({ label, value, onChange, placeholder, rows = 3, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} hint={hint}>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field" />
    </FormField>
  );
}

/** Bangla and English side by side. */
export function TextPair({ label, value, onChange, placeholder }: { label: string; value: Text; onChange: (value: Text) => void; placeholder?: Text }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label={`${label} · বাংলা`} value={value.bn} placeholder={placeholder?.bn} onChange={(bn) => onChange({ ...value, bn })} />
      <Input label={`${label} · English`} value={value.en} placeholder={placeholder?.en} onChange={(en) => onChange({ ...value, en })} />
    </div>
  );
}

/** Digits only, for amounts typed as text. */
export const digits = (value: string) => value.replace(/[^\d]/g, "");
