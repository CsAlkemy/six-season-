"use client";

import { useActionState } from "react";

import { login } from "@/app/admin/actions";

import { Button, ContentCard, FormField } from "./ui";

/** One card centred on the brand tint, like Motherhood's admin sign-in. */
export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-subtle px-4 py-10">
      <ContentCard padding="md" className="w-full max-w-110 gap-6 rounded-xl sm:p-8">
        <img src="/logo.svg" alt="Matir Taan" className="h-14 w-auto self-start" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h2 text-fg-primary">Sign in</h1>
          <p className="text-body-sm text-fg-secondary">Enter the admin password to manage orders, products and the store.</p>
        </div>
        <form action={action} className="flex flex-col gap-4">
          <FormField label="Admin password" htmlFor="password" error={error}>
            <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" aria-invalid={error ? true : undefined} className="field" />
          </FormField>
          <Button type="submit" loading={pending} className="w-full">{pending ? "Signing in…" : "Sign in"}</Button>
        </form>
      </ContentCard>
    </main>
  );
}
