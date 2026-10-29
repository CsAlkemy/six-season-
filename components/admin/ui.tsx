import Link from "next/link";

import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

/**
 * The back office's building blocks, ported from Motherhood's shared UI (ContentCard, StatusPill, CommonTabs,
 * KpiCard, DataTable, CommonPagination, AdminPageHeader…). Nothing here needs the browser; the pieces that
 * do (switch, menu, modal, toast, filters) live in controls.tsx.
 */

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* Icons: Lucide's strokes on a 24px grid. */

const ICONS = {
  dashboard: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  orders: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
  products: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7 12 12l8.7-5M12 22V12",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-2a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  search: "m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  x: "M18 6 6 18M6 6l12 12",
  plus: "M5 12h14M12 5v14",
  check: "M20 6 9 17l-5-5",
  menu: "M4 12h16M4 6h16M4 18h16",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  more: "M12 12h.01M19 12h.01M5 12h.01",
  copy: "M8 8h12v12H8zM4 16V4h12",
  external: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className, strokeWidth = 2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    // 16px unless the caller sets a size of its own.
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", !className?.includes("size-") && "size-4", className)} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/* Buttons: pills, like the store's. */

export type ButtonVariant = "primary" | "secondary" | "dark" | "outline" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "icon" | "inline";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand text-fg-inverse hover:bg-brand-hover",
  secondary: "bg-brand-soft text-fg-brand hover:bg-brand-soft-hover",
  dark: "bg-inverse text-fg-inverse hover:bg-inverse-hover",
  outline: "border border-border-strong bg-surface text-fg-primary hover:bg-muted",
  ghost: "text-fg-primary hover:bg-muted",
  link: "rounded-sm text-label-md text-fg-brand underline-offset-4 hover:underline",
};
const SIZE: Record<ButtonSize, string> = { default: "px-6 py-3", sm: "px-4 py-2 text-label-md", icon: "size-11", inline: "p-0" };

export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "default", extra?: string) =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-label-button whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANT[variant],
    SIZE[size],
    extra,
  );

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <span role="status" aria-label="Loading" className={cn("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function Button({ variant, size, loading, className, children, disabled, ...props }: { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean } & React.ComponentProps<"button">) {
  return (
    <button type="button" disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/** A plain <a> that looks like a button, for downloads (a client-side Link can't save a file). */
export function DownloadButton({ variant, size, className, ...props }: { variant?: ButtonVariant; size?: ButtonSize } & React.ComponentProps<"a">) {
  return <a className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: { variant?: ButtonVariant; size?: ButtonSize } & React.ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* Page furniture */

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumbs, the H2 title, a line of description and the page's buttons on the right. */
export function PageHeader({ title, description, crumbs, actions }: { title: React.ReactNode; description?: React.ReactNode; crumbs?: Crumb[]; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {crumbs?.length ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
            {crumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {crumb.href ? <Link href={crumb.href} className="rounded-xs transition-colors hover:text-fg-primary">{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-h2 text-fg-primary max-sm:text-h3">{title}</h1>
          {description ? <p className="text-body-sm text-fg-secondary">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3 max-sm:[&>*]:flex-1">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Every admin page's frame: 32px gutters on desktop, 16px on phones. */
export const PageBody = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-6 px-4 pb-12 pt-4 sm:px-8 lg:pt-7">{children}</div>;

/** A white card: 16px corners, 24px padding, an H4 title with an optional action beside it. */
export function ContentCard({ title, subtitle, action, flush, tone = "default", padding = "lg", className, children }: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** Content runs edge to edge (tables); only the header keeps the side padding. */
  flush?: boolean;
  tone?: "default" | "brand";
  padding?: "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  const heading = <h2 className="text-h4 text-fg-primary">{title}</h2>;
  return (
    <section className={cn("flex flex-col rounded-lg border", tone === "brand" ? "border-border-brand bg-brand-subtle" : "border-border bg-surface", flush ? "py-6" : cn("gap-4", padding === "lg" ? "p-6" : "p-4 sm:p-6"), className)}>
      {title ? (
        <div className={cn("flex items-center justify-between gap-4", flush && "px-6 pb-4")}>
          {subtitle ? <div className="flex min-w-0 flex-col gap-0.5">{heading}<p className="text-caption text-fg-secondary">{subtitle}</p></div> : heading}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A number with its change against the period before. */
export function KpiCard({ label, value, delta, trend, note, valueClassName }: { label: React.ReactNode; value: React.ReactNode; delta?: React.ReactNode; trend?: "up" | "down"; note?: React.ReactNode; valueClassName?: string }) {
  const up = trend === "up";
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 sm:gap-2 sm:p-6">
      <p className="text-body-sm text-fg-secondary">{label}</p>
      <p className={cn("text-h3 text-fg-primary sm:text-h2", valueClassName)}>{value}</p>
      <p className="flex flex-wrap items-center gap-2">
        {delta !== undefined && (
          <span className={cn("text-label-md", up ? "text-fg-success" : "text-fg-error")}>
            <span aria-hidden>{up ? "▲" : "▼"} </span>
            <span className="sr-only">{up ? "Up " : "Down "}</span>
            {delta}
          </span>
        )}
        {note && <span className="text-caption text-fg-tertiary">{note}</span>}
      </p>
    </div>
  );
}

/* Pills */

export type StatusTone = "success" | "pending" | "failed" | "neutral" | "info";
const TONE: Record<StatusTone, string> = {
  success: "bg-success-soft text-fg-success",
  pending: "bg-accent-soft text-fg-accent",
  failed: "bg-error-soft text-fg-error",
  neutral: "bg-muted text-fg-secondary",
  info: "bg-brand-soft text-fg-brand",
};

export function StatusPill({ tone, className, children }: { tone: StatusTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption whitespace-nowrap", TONE[tone], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export const OrderPill = ({ status, className }: { status: OrderStatus; className?: string }) => (
  <StatusPill tone={STATUS_TONE[status]} className={className}>{STATUS_LABEL[status]}</StatusPill>
);

/** Underlined tabs with a count pill each. */
export function Tabs({ items, label }: { items: { href: string; label: string; count?: number; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max min-w-full gap-6">
        {items.map((item) => (
          <li key={item.label} className="shrink-0">
            <Link
              href={item.href}
              scroll={false}
              aria-current={item.active ? "page" : undefined}
              className={cn("-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-label-md whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-brand", item.active ? "border-brand text-fg-brand" : "border-transparent text-fg-secondary hover:text-fg-primary")}
            >
              {item.label}
              {item.count !== undefined && <span className={cn("min-w-6 rounded-full px-2 py-1 text-center text-caption", item.active ? "bg-brand-soft text-fg-brand" : "bg-muted text-fg-secondary")}>{item.count.toLocaleString("en-US")}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** 1 2 3 … 24: the first and last pages and the ones beside the current. */
function pageItems(page: number, pages: number): (number | "gap")[] {
  const shown = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  if (page <= 2 && pages >= 3 && !shown.includes(3)) shown.splice(shown.indexOf(pages), 0, 3);
  return shown.flatMap((n, i) => {
    const prev = shown[i - 1];
    if (prev === undefined || n - prev === 1) return [n];
    return n - prev === 2 ? [n - 1, n] : (["gap", n] as const);
  });
}

/** "Showing 1–20 of 64 orders" with numbered pages beside it. */
export function Pagination({ page, pageSize, total, href, noun }: { page: number; pageSize: number; total: number; href: (page: number) => string; noun: [string, string] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const box = "flex size-8.5 items-center justify-center rounded-md text-label-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
  const idle = "border border-border bg-surface text-fg-secondary hover:bg-muted";
  const step = (to: number, label: string, icon: IconName, off: boolean) =>
    off ? <span aria-hidden className={cn(box, idle, "opacity-50")}><Icon name={icon} /></span> : <Link href={href(to)} scroll={false} aria-label={label} className={cn(box, idle)}><Icon name={icon} /></Link>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
      <p className="text-body-sm text-fg-secondary">
        Showing {((page - 1) * pageSize + 1).toLocaleString("en-US")}–{Math.min(page * pageSize, total).toLocaleString("en-US")} of {total.toLocaleString("en-US")} {total === 1 ? noun[0] : noun[1]}
      </p>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap gap-2">
          {step(page - 1, "Previous page", "chevronLeft", page <= 1)}
          {pageItems(page, pages).map((item, i) =>
            item === "gap" ? <span key={`gap-${i}`} aria-hidden className={cn(box, idle)}>…</span> : (
              <Link key={item} href={href(item)} scroll={false} aria-label={`Page ${item}`} aria-current={item === page ? "page" : undefined} className={cn(box, item === page ? "bg-brand text-fg-inverse" : idle)}>{item}</Link>
            ),
          )}
          {step(page + 1, "Next page", "chevronRight", page >= pages)}
        </nav>
      )}
    </div>
  );
}

/* Tables */

/** Cell padding: 12px between columns, 24px at the table's sides. */
export const cellClass = "py-3 pr-3 first:pl-6 last:pr-6";

/** The table in its bordered, rounded frame; scrolls sideways under `minWidth`. */
export function Table({ minWidth = "min-w-200", widths, head, className, children, fixed = true, bare }: { minWidth?: string; widths?: string[]; head: React.ReactNode; className?: string; children: React.ReactNode; fixed?: boolean; /** No frame: the table sits inside a card that has its own. */ bare?: boolean }) {
  return (
    <div className={cn("relative max-w-full overflow-x-auto overscroll-x-contain", !bare && "rounded-lg border border-border bg-surface", className)}>
      <table className={cn("w-full text-left text-body-sm text-fg-primary", fixed && "table-fixed", minWidth)}>
        {widths && <colgroup>{widths.map((w, i) => <col key={i} className={w || undefined} />)}</colgroup>}
        <thead className="border-b border-border bg-muted text-caption text-fg-tertiary uppercase"><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const Th = ({ className, ...props }: React.ComponentProps<"th">) => <th scope="col" className={cn(cellClass, "font-medium", className)} {...props} />;
export const Td = ({ className, ...props }: React.ComponentProps<"td">) => <td className={cn(cellClass, className)} {...props} />;

/** A row that says why it's empty, with one way out. */
export const TableMessage = ({ colSpan, children }: { colSpan: number; children: React.ReactNode }) => (
  <tr><td colSpan={colSpan} className="px-6 py-12 text-center">{children}</td></tr>
);

/** Why a list is empty: a line, and a link-style way out. */
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-label-md text-fg-primary">{title}</p>
      {children && <p className="text-body-sm text-fg-secondary">{children}</p>}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-md bg-muted", className)} />;

export function Callout({ tone = "muted", children }: { tone?: "muted" | "error" | "success"; children: React.ReactNode }) {
  return <p role={tone === "error" ? "alert" : undefined} className={cn("rounded-md px-4 py-3 text-body-sm", tone === "error" ? "bg-error-soft text-fg-error" : tone === "success" ? "bg-success-soft text-fg-success" : "bg-muted text-fg-secondary")}>{children}</p>;
}

/** Initials in a tinted circle. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase()).join("").slice(0, 2);
  return <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-label-md text-fg-brand", className)}>{initials || "?"}</span>;
}

/** A small label over its value, as the order side cards show them. */
export function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-caption text-fg-tertiary">{label}</p>
      <div className="text-label-md text-fg-primary">{children}</div>
    </div>
  );
}

/** A label, the control, then a hint or an error under it. */
export function FormField({ label, htmlFor, hint, error, className, children }: { label?: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; error?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-2", className)}>
      {/* A label with nothing to point at is plain text, not an orphaned <label>. */}
      {label && (htmlFor ? <label htmlFor={htmlFor} className="text-label-md text-fg-primary">{label}</label> : <span className="text-label-md text-fg-primary">{label}</span>)}
      {children}
      {error ? <p className="text-caption text-fg-error">{error}</p> : hint ? <p className="text-caption text-fg-tertiary">{hint}</p> : null}
    </div>
  );
}
