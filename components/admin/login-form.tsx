"use client";

import { useActionState } from "react";

import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card mx-auto mt-16 max-w-sm space-y-5 p-8">
      <img src="/logo.svg" alt="Matir Taan" className="mx-auto h-16 w-auto" />
      <div>
        <label htmlFor="password" className="label">Admin password</label>
        <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" className="field" />
      </div>
      {error && <p className="text-body-sm text-fg-error" role="alert">{error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
