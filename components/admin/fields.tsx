"use client";

import { useId } from "react";

import type { Text } from "@/lib/types";

import { FormField } from "./ui";

/** A labelled text or number input whose label is wired to it. */
/** The store's own words, never the browser's autofill, so a saved phone number or address can't land in a headline or an answer. */
export function Input({ label, value, onChange, type = "text", placeholder, hint, prefix, error, autoFocus, inputMode, maxLength }: {
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
  /** The save action's limit, so typing stops where saving would cut the text short. */
  maxLength?: number;
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        {prefix && <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-tertiary">{prefix}</span>}
        <input id={id} type={type} inputMode={inputMode} min={type === "number" ? 0 : undefined} maxLength={maxLength} autoFocus={autoFocus} autoComplete="off" value={value} placeholder={placeholder} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value)} className={prefix ? "field pl-9" : "field"} />
      </div>
    </FormField>
  );
}

export function TextArea({ label, value, onChange, placeholder, rows = 3, hint, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; hint?: React.ReactNode; maxLength?: number }) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} hint={hint}>
      <textarea id={id} rows={rows} maxLength={maxLength} autoComplete="off" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field" />
    </FormField>
  );
}

/** Bangla and English side by side; with `rows`, two text areas for longer copy. */
export function TextPair({ label, value, onChange, placeholder, maxLength, rows }: { label: string; value: Text; onChange: (value: Text) => void; placeholder?: Text; maxLength?: number; rows?: number }) {
  const field = (lang: keyof Text, name: string) => {
    const props = { label: `${label} · ${name}`, value: value[lang], placeholder: placeholder?.[lang], maxLength, onChange: (v: string) => onChange({ ...value, [lang]: v }) };
    return rows ? <TextArea rows={rows} {...props} /> : <Input {...props} />;
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field("bn", "বাংলা")}
      {field("en", "English")}
    </div>
  );
}

/** Digits only, for amounts typed as text. */
export const digits = (value: string) => value.replace(/[^\d]/g, "");
