"use client";

import { useEffect, useState } from "react";

import type { Dict } from "@/lib/i18n";

interface Props {
  d: Dict;
  phone: string;
  value: string;
  onChange: (code: string) => void;
  onResend: () => void;
  onChangeNumber: () => void;
  disabled?: boolean;
}

const RESEND_SECONDS = 60;

/** The code box after an SMS goes out, with resend (after the server's cooldown) and a way back to the number. */
export function OtpField({ d, phone, value, onChange, onResend, onChangeNumber, disabled }: Props) {
  const [wait, setWait] = useState(RESEND_SECONDS);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  return (
    <div>
      <p className="mb-3 text-body-sm text-fg-secondary">
        {d.codeSentTo} <strong className="tabular-nums text-fg-primary">{phone}</strong>
      </p>
      <label htmlFor="otp" className="label">{d.otpCode}</label>
      <input
        id="otp"
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)).replace(/\D/g, ""))}
        className="field text-center text-h4 tracking-[0.5em] tabular-nums"
      />
      <div className="mt-2 flex justify-between text-body-sm">
        <button type="button" onClick={onChangeNumber} className="text-fg-secondary underline hover:text-fg-brand">
          {d.changeNumber}
        </button>
        <button
          type="button"
          disabled={disabled || wait > 0}
          onClick={() => {
            setWait(RESEND_SECONDS);
            onResend();
          }}
          className="font-semibold text-fg-brand underline disabled:text-fg-tertiary disabled:no-underline"
        >
          {d.resend}
          {wait > 0 && ` (${wait})`}
        </button>
      </div>
    </div>
  );
}
