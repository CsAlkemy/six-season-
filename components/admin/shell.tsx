"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, cn, Icon, type IconName } from "./ui";

const GROUPS: { group: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  { group: "Main", items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }, { href: "/admin/orders", label: "Orders", icon: "orders" }] },
  { group: "Catalog", items: [{ href: "/admin/products", label: "Products", icon: "products" }] },
];
const ALL = [...GROUPS.flatMap((g) => g.items), { href: "/admin/settings", label: "Settings", icon: "settings" as IconName }];

/** The longest href the path sits under, so /admin/orders/123 lights up Orders and not Dashboard. */
const activeHref = (path: string) => ALL.filter((i) => path === i.href || path.startsWith(`${i.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

const itemClass = "flex w-full items-center gap-3 rounded-md p-3 text-label-md transition-colors focus-visible:outline-2 focus-visible:outline-brand";

function NavItem({ href, label, icon, active, badge, onNavigate }: { href: string; label: string; icon: IconName; active: boolean; badge?: number; onNavigate?: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(itemClass, active ? "bg-brand-subtle text-fg-brand" : "text-fg-secondary hover:bg-muted hover:text-fg-primary")}>
      <Icon name={icon} className={cn("size-4.5", active ? "text-fg-brand" : "text-neutral-400")} strokeWidth={2.5} />
      {label}
      {badge ? <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-caption text-fg-inverse">{badge}</span> : null}
    </Link>
  );
}

const Badge = () => <span className="rounded-sm bg-brand-soft px-2 py-0.5 text-caption text-fg-brand">Admin</span>;

/**
 * Motherhood's back-office frame: a 260px sidebar with grouped links, a top bar with search, and the page
 * scrolling on its own. On phones the sidebar becomes a header with a sheet menu and a bottom tab bar.
 */
export function AdminShell({ newOrders, logout, children }: { newOrders: number; logout: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const active = activeHref(path);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => setMenu(false), [path]);

  const logoutForm = (cls: string, icon = true) => (
    <form action={logout}>
      <button className={cn(itemClass, "text-fg-error hover:bg-error-soft", cls)}>{icon && <Icon name="logout" className="size-4.5 text-fg-error" strokeWidth={2.5} />}Log out</button>
    </form>
  );
  const bell = (
    <Link href="/admin/orders?status=new" aria-label={newOrders ? `${newOrders} new orders` : "No new orders"} className="relative grid size-10 shrink-0 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-muted hover:text-fg-primary">
      <Icon name="bell" className="size-5" />
      {newOrders > 0 && <span className="absolute top-0.5 right-0.5 grid min-w-4.5 place-items-center rounded-full bg-fg-error px-1 text-[10px] leading-4.5 font-semibold text-fg-inverse">{newOrders > 99 ? "99+" : newOrders}</span>}
    </Link>
  );

  return (
    <div className="flex h-screen bg-page max-lg:h-dvh max-lg:flex-col" data-print-hide-chrome>
      <aside className="flex h-full w-65 shrink-0 flex-col gap-1 border-r border-border bg-surface px-4 py-5 max-lg:hidden">
        <div className="flex items-center gap-2.5 pb-6 pl-2">
          <Link href="/admin"><img src="/logo.svg" alt="Matir Taan" className="h-10 w-auto" /></Link>
          <Badge />
        </div>
        <nav aria-label="Admin" className="flex flex-col gap-1">
          {GROUPS.map(({ group, items }) => (
            <div key={group}>
              <p className="text-overline text-fg-tertiary uppercase">{group}</p>
              <ul className="flex flex-col gap-0.5 pt-3 pb-2">
                {items.map((item) => <li key={item.href}><NavItem {...item} active={item.href === active} badge={item.href === "/admin/orders" ? newOrders : undefined} /></li>)}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col">
          <Link href="/bn" target="_blank" className={cn(itemClass, "text-fg-secondary hover:bg-muted hover:text-fg-primary")}><Icon name="external" className="size-4.5 text-neutral-400" strokeWidth={2.5} />View store</Link>
          <NavItem href="/admin/settings" label="Settings" icon="settings" active={active === "/admin/settings"} />
          {logoutForm("")}
        </div>
      </aside>

      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 lg:hidden">
        <span className="flex items-center gap-2.5"><Link href="/admin"><img src="/logo.svg" alt="Matir Taan" className="h-9 w-auto" /></Link><Badge /></span>
        <span className="flex items-center gap-1">
          {bell}
          <button type="button" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(true)} className="grid size-10 place-items-center rounded-full text-fg-secondary hover:bg-muted"><Icon name="menu" className="size-5" /></button>
        </span>
      </header>

      <div className="flex min-w-0 flex-1 flex-col max-lg:min-h-0">
        <header className="flex h-18 shrink-0 items-center gap-4 border-b border-border bg-surface px-8 max-lg:hidden">
          <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/admin/orders${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`); }} className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-muted px-4 py-3 focus-within:ring-3 focus-within:ring-brand-soft">
            <Icon name="search" className="size-4 text-neutral-400" strokeWidth={2.85} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders by number, customer or phone…" aria-label="Search orders by number, customer or phone" className="min-w-0 flex-1 bg-transparent text-body-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
          </form>
          {bell}
          <div className="flex shrink-0 items-center gap-2.5">
            <Avatar name="Matir Taan" className="size-10 text-caption" />
            <div className="hidden flex-col sm:flex"><span className="text-label-md text-fg-primary">Matir Taan</span><span className="text-caption text-fg-tertiary">Store owner</span></div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto max-lg:pb-20">{children}</main>
      </div>

      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {ALL.map((item) => (
          <Link key={item.href} href={item.href} aria-current={item.href === active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-caption", item.href === active ? "text-fg-brand" : "text-fg-secondary")}>
            <Icon name={item.icon} className="size-5" />{item.label}
          </Link>
        ))}
      </nav>

      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-neutral-900/40" onClick={() => setMenu(false)} />
          <div className="adm-pop absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col gap-1 bg-surface p-4">
            <div className="flex items-center justify-between pb-3"><Badge /><button type="button" aria-label="Close" onClick={() => setMenu(false)} className="grid size-9 place-items-center rounded-full hover:bg-muted"><Icon name="x" className="size-5" /></button></div>
            {ALL.map((item) => <NavItem key={item.href} {...item} active={item.href === active} onNavigate={() => setMenu(false)} badge={item.href === "/admin/orders" ? newOrders : undefined} />)}
            <Link href="/bn" target="_blank" className={cn(itemClass, "text-fg-secondary hover:bg-muted")}><Icon name="external" className="size-4.5 text-neutral-400" strokeWidth={2.5} />View store</Link>
            <div className="mt-auto">{logoutForm("")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
