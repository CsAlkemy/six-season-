import type { Metadata } from "next";

import "../globals.css";
import { logout } from "@/app/admin/actions";
import { Toaster } from "@/components/admin/controls";
import { AdminShell } from "@/components/admin/shell";
import { isAdmin } from "@/lib/auth";
import { loadAllOrders } from "@/lib/data";
import { fontVars } from "@/lib/fonts";

export const metadata: Metadata = { title: { default: "Admin · Matir Taan", template: "%s · Admin · Matir Taan" }, robots: { index: false, follow: false } };

/** Motherhood's back-office frame; the login page stands alone without it. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();
  const fresh = signedIn ? (await loadAllOrders(100).catch(() => [])).filter((o) => o.status === "new").length : 0;
  return (
    <html lang="en" className={fontVars} data-admin>
      <body className="min-h-dvh bg-page">
        {signedIn ? <AdminShell newOrders={fresh} logout={logout}>{children}</AdminShell> : children}
        <Toaster />
      </body>
    </html>
  );
}
