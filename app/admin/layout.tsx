import type { Metadata } from "next";
import Link from "next/link";

import "../globals.css";
import { logout } from "@/app/admin/actions";
import { isAdmin } from "@/lib/auth";
import { fontVars } from "@/lib/fonts";

export const metadata: Metadata = { title: "Admin · Matir Taan", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();
  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-dvh bg-muted">
        {signedIn && (
          <header className="sticky top-0 z-30 border-b border-border bg-surface">
            <div className="container-page flex h-16 items-center gap-6">
              <Link href="/admin">
                <img src="/logo.svg" alt="Matir Taan" className="h-10 w-auto" />
              </Link>
              <nav className="flex flex-1 gap-1 overflow-x-auto">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-full px-3 py-1.5 text-label hover:bg-brand-soft">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Link href="/bn" target="_blank" className="hidden text-body-sm font-semibold text-fg-secondary hover:text-fg-brand sm:block">
                View store ↗
              </Link>
              <form action={logout}>
                <button className="text-body-sm font-semibold text-fg-secondary hover:text-fg-error">Log out</button>
              </form>
            </div>
          </header>
        )}
        <main className="container-page py-8">{children}</main>
      </body>
    </html>
  );
}
