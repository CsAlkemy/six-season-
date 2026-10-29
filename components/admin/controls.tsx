"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { cn, Icon, Table, TableMessage, Td, Th } from "./ui";

/**
 * The interactive half of the back office's UI kit, ported from Motherhood: Switch, Checkbox, the menu behind a
 * status pill, the modal, toasts, the dark bulk bar, the list's search and filters, and the data table.
 */

/* Switch and checkbox */

/** On/off toggle (44×24). */
export function Switch({ checked, onCheckedChange, className, ...props }: { checked: boolean; onCheckedChange: (checked: boolean) => void } & Omit<React.ComponentProps<"button">, "onChange" | "role" | "type">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) onCheckedChange(!checked);
      }}
      {...props}
      className={cn("group inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50", checked ? "bg-brand" : "bg-border-strong", className)}
    >
      <span aria-hidden className={cn("size-5 rounded-full bg-surface shadow-card transition-transform", checked && "translate-x-5")} />
    </button>
  );
}

/** A switch with its label and a line under it. */
export function SwitchRow({ label, description, checked, onCheckedChange, disabled, className }: { label: React.ReactNode; description?: React.ReactNode; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="flex min-w-0 flex-col gap-0.5">
        <span className="text-label-md text-fg-primary">{label}</span>
        {description && <span className="text-caption text-fg-tertiary">{description}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function Checkbox({ indeterminate, className, ...props }: { indeterminate?: boolean } & Omit<React.ComponentProps<"input">, "type">) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" className={cn("adm-check", className)} {...props} />;
}

/* Menu: the dropdown behind a status pill or a ⋯ button. It's portalled so a table's scroll box can't clip it. */

export type MenuItem = { label: React.ReactNode; onSelect: () => void; destructive?: boolean; disabled?: boolean } | { separator: true };

export function Menu({ trigger, items, align = "end" }: { trigger: React.ReactElement<React.ComponentProps<"button">>; items: MenuItem[]; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    setBox({ top: r.bottom + 6, ...(align === "end" ? { right: innerWidth - r.right } : { left: r.left }) });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>("[role=menuitem]:not(:disabled)")?.focus();
    const close = () => setOpen(false);
    const onDown = (e: PointerEvent) => !list.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const all = [...(list.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not(:disabled)") ?? [])];
      const at = all.indexOf(document.activeElement as HTMLElement);
      all[(at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
      e.preventDefault();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    addEventListener("resize", close);
    addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      removeEventListener("resize", close);
      removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <span ref={anchor} className="inline-flex" data-state={open ? "open" : "closed"}>
      {isValidElement(trigger) &&
        cloneElement(trigger, { "aria-haspopup": "menu", "aria-expanded": open, onClick: (e: React.MouseEvent<HTMLButtonElement>) => { trigger.props.onClick?.(e); setOpen((o) => !o); } })}
      {open && box && createPortal(
        <div ref={list} role="menu" style={box} className="adm-pop fixed z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-hover">
          {items.map((item, i) =>
            "separator" in item ? <div key={i} role="separator" className="my-1 h-px bg-border" /> : (
              <button key={i} type="button" role="menuitem" disabled={item.disabled} onClick={() => { setOpen(false); item.onSelect(); }} className={cn("flex w-full items-center rounded-sm px-3 py-2 text-left text-body-sm focus:outline-none disabled:opacity-50", item.destructive ? "text-fg-error hover:bg-error-soft focus:bg-error-soft" : "text-fg-primary hover:bg-muted focus:bg-muted")}>
                {item.label}
              </button>
            ),
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}

/** The ⋯ button that opens a row's menu. */
export const RowMenu = ({ label, items }: { label: string; items: MenuItem[] }) => (
  <Menu items={items} trigger={<button type="button" aria-label={label} className="grid size-8 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-muted hover:text-fg-primary data-[state=open]:bg-muted"><Icon name="more" className="size-5" /></button>} />
);

/* Modal: the back office's "spacious" dialog (560px, 32px padding, H2 title with its ✕ on the same line). */

export function Modal({ open, onOpenChange, title, description, footer, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: React.ReactNode; description?: React.ReactNode; footer?: React.ReactNode; children?: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (open && el && !el.open) el.showModal();
    if (!open && el?.open) el.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-label={typeof title === "string" ? title : undefined}
      onClose={() => onOpenChange(false)}
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
      className="adm-dialog m-auto max-h-[calc(100dvh-2rem)] w-full max-w-140 overflow-y-auto rounded-xl border-0 p-0 text-fg-primary shadow-hover max-sm:w-[calc(100%-1.5rem)]"
    >
      <div className="flex flex-col gap-4 p-8 max-sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-display text-h2 text-fg-primary max-sm:text-h3">{title}</h2>
            {description && <p className="text-body-sm text-fg-secondary">{description}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="mt-1 rounded-sm text-fg-tertiary transition-colors hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-brand"><Icon name="x" className="size-5" /></button>
        </div>
        {children}
        {footer && <div className="flex gap-3 [&>*]:flex-1">{footer}</div>}
      </div>
    </dialog>
  );
}

/* Toasts */

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; text: string };
const listeners = new Set<(t: ToastItem) => void>();
let nextId = 1;
const emit = (kind: ToastKind) => (text: string) => listeners.forEach((l) => l({ id: nextId++, kind, text }));
export const toast = { success: emit("success"), error: emit("error"), info: emit("info") };

const TOAST_TONE: Record<ToastKind, string> = {
  success: "border-border-brand bg-success-soft text-fg-success",
  error: "border-fg-error/30 bg-error-soft text-fg-error",
  info: "border-border bg-surface text-fg-primary",
};

/** Mounted once in the layout; `toast.success("Saved")` from anywhere shows here. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const on = (t: ToastItem) => {
      setItems((list) => [...list.slice(-3), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.kind === "error" ? 7000 : 4000);
    };
    listeners.add(on);
    return () => void listeners.delete(on);
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={cn("adm-pop pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-body-sm shadow-hover", TOAST_TONE[t.kind])}>
          <Icon name={t.kind === "success" ? "check" : t.kind === "error" ? "x" : "bell"} className="mt-0.5 size-4" strokeWidth={2.5} />
          <p className="min-w-0 flex-1">{t.text}</p>
          <button type="button" aria-label="Dismiss" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} className="opacity-60 hover:opacity-100"><Icon name="x" /></button>
        </div>
      ))}
    </div>
  );
}

/* The dark bar that floats over the bottom of a list while rows are ticked. */

export function BulkBar({ count, actions, onClear, busy }: { count: number; actions: { label: string; onSelect: () => void; disabled?: boolean }[]; onClear: () => void; busy?: boolean }) {
  if (!count) return null;
  const divider = <span aria-hidden className="h-5 w-px shrink-0 bg-neutral-500 max-sm:hidden" />;
  const link = "rounded-xs text-label-md text-fg-inverse transition-opacity hover:opacity-80 disabled:opacity-40";
  return (
    <div className="pointer-events-none sticky bottom-6 z-10 flex justify-center max-lg:bottom-20">
      <div role="toolbar" aria-label={`${count} selected`} aria-busy={busy} className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-full bg-inverse px-6 py-3 text-fg-inverse shadow-hover max-sm:w-full max-sm:rounded-lg max-sm:px-4">
        <span className="flex items-center gap-4"><span className="rounded-full bg-brand px-2 py-0.5 text-label-md">{count}</span><span className="text-label-md">selected</span></span>
        {divider}
        {actions.map((a) => <button key={a.label} type="button" disabled={busy || a.disabled} onClick={a.onSelect} className={link}>{a.label}</button>)}
        {divider}
        <button type="button" onClick={onClear} className={cn(link, "text-neutral-300")}>Clear</button>
      </div>
    </div>
  );
}

/* Search and filters: the URL holds the state, as in Motherhood's lists. */

export function SearchField({ containerClassName, className, ...props }: Omit<React.ComponentProps<"input">, "type"> & { containerClassName?: string }) {
  return (
    <label className={cn("flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand-soft max-sm:min-w-full max-sm:basis-full", containerClassName)}>
      <Icon name="search" className="text-fg-tertiary" />
      <input type="search" className={cn("min-w-0 flex-1 bg-transparent text-body-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none [&::-webkit-search-cancel-button]:hidden", className)} {...props} />
    </label>
  );
}

export function FilterSelect({ label, allLabel, value, options, onChange }: { label: string; allLabel?: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="relative inline-flex">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn("h-full appearance-none rounded-md border border-border bg-surface py-3 pr-10 pl-4 text-label-md focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand-soft focus-visible:outline-none", value ? "text-fg-primary" : "text-fg-secondary")}>
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-tertiary" />
    </label>
  );
}

export interface FilterSpec {
  param: string;
  label: string;
  allLabel?: string;
  options: { value: string; label: string }[];
  /** What the URL means when the param is missing, e.g. "all" for a date range. */
  fallback?: string;
}

/** Search (debounced, or at once on Enter) and selects. Changing any of them goes back to page 1. */
export function ListFilters({ searchParam = "q", placeholder, filters, clearHref }: { searchParam?: string; placeholder: string; filters: FilterSpec[]; clearHref?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const urlSearch = params.get(searchParam) ?? "";
  const [search, setSearch] = useState(urlSearch);
  /** The last value this box put in the URL, so the URL catching up never overwrites newer typing. */
  const sent = useRef(urlSearch);

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      if (searchParam in patch) sent.current = patch[searchParam] ?? "";
      for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
      next.delete("page");
      start(() => router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false }));
    },
    [params, path, router],
  );

  // Back and Forward move the box; the URL following our own typing doesn't.
  useEffect(() => {
    if (urlSearch !== sent.current) {
      sent.current = urlSearch;
      setSearch(urlSearch);
    }
  }, [urlSearch]);
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === urlSearch) return;
    const t = setTimeout(() => update({ [searchParam]: trimmed || undefined }), 400);
    return () => clearTimeout(t);
  }, [search, urlSearch, searchParam, update]);

  const active = Boolean(urlSearch) || filters.some((f) => (params.get(f.param) ?? f.fallback ?? "") !== (f.fallback ?? ""));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchField
        containerClassName="sm:min-w-60 sm:flex-1"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && update({ [searchParam]: search.trim() || undefined })}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <div className="flex gap-3 overflow-x-auto sm:contents">
        {filters.map((f) => (
          <FilterSelect key={f.param} label={f.label} allLabel={f.allLabel} value={params.get(f.param) ?? f.fallback ?? ""} options={f.options} onChange={(v) => update({ [f.param]: v && v !== f.fallback ? v : undefined })} />
        ))}
      </div>
      {active && clearHref && (
        <button type="button" onClick={() => { setSearch(""); start(() => router.replace(clearHref, { scroll: false })); }} className="text-label-md text-fg-brand underline-offset-4 hover:underline">Clear filters</button>
      )}
    </div>
  );
}

/* Data table: columns, a checkbox column, clickable rows. */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export interface Selection {
  selected: ReadonlySet<string>;
  onChange: (key: string, on: boolean) => void;
  onChangeAll: (on: boolean) => void;
  allLabel?: string;
  rowLabel?: (key: string) => string;
}

const INTERACTIVE = "a, button, input, label, select, [role=menu], [role=menuitem]";

export function DataTable<T>({ columns, rows, rowKey, minWidth, onRowClick, rowClassName, empty, selection, busy, label }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  minWidth?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  empty?: React.ReactNode;
  selection?: Selection;
  busy?: boolean;
  label: string;
}) {
  const keys = rows.map(rowKey);
  const ticked = keys.filter((k) => selection?.selected.has(k)).length;
  const span = columns.length + (selection ? 1 : 0);
  return (
    <div aria-busy={busy} aria-label={label}>
      <Table
        minWidth={minWidth}
        className={cn("transition-opacity", busy && "opacity-60")}
        widths={[...(selection ? ["w-15"] : []), ...columns.map((c) => c.width ?? "")]}
        head={
          <>
            {selection && (
              <Th><Checkbox aria-label={selection.allLabel ?? "Select all on this page"} checked={keys.length > 0 && ticked === keys.length} indeterminate={ticked > 0 && ticked < keys.length} disabled={!keys.length} onChange={(e) => selection.onChangeAll(e.target.checked)} /></Th>
            )}
            {columns.map((c) => <Th key={c.key}>{c.header}</Th>)}
          </>
        }
      >
        {rows.length === 0 && empty ? <TableMessage colSpan={span}>{empty}</TableMessage> : rows.map((row) => {
          const key = rowKey(row);
          return (
            <tr
              key={key}
              onClick={onRowClick ? (e) => {
                if ((e.target as HTMLElement).closest(INTERACTIVE) || window.getSelection()?.toString()) return;
                onRowClick(row);
              } : undefined}
              className={cn("border-b border-border last:border-b-0", onRowClick && "cursor-pointer transition-colors hover:bg-page", selection?.selected.has(key) && "bg-brand-subtle", rowClassName?.(row))}
            >
              {selection && <Td><Checkbox aria-label={selection.rowLabel?.(key) ?? `Select ${key}`} checked={selection.selected.has(key)} onChange={(e) => selection.onChange(key, e.target.checked)} /></Td>}
              {columns.map((c) => <Td key={c.key} className={c.className}>{c.cell(row)}</Td>)}
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

/** A click-to-copy order number that's also a link. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" aria-label={label} onClick={() => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className="rounded-xs text-fg-tertiary opacity-0 transition-opacity group-hover/copy:opacity-100 focus-visible:opacity-100">
      <Icon name={copied ? "check" : "copy"} className="size-3.5" />
    </button>
  );
}
