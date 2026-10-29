"use client";

import { useRef, useState } from "react";

import type { HomeSection, Settings } from "@/lib/types";

import { Modal, RowMenu, SearchField, Switch, toast } from "./controls";
import { TextPair } from "./fields";
import { uploadPhoto } from "./image-upload";
import { Button, cn, ContentCard, FormField, Icon, StatusPill } from "./ui";

export type PickerProduct = { id: string; name: { bn: string; en: string }; image: string | null; active: boolean };
type Home = Settings["home"];

/** The hero as the store draws it, small: the photo or green behind the title, so the admin sees what they're typing. */
function HeroPreview({ hero }: { hero: Home["hero"] }) {
  return (
    <div className="relative isolate flex aspect-[16/5] items-end overflow-hidden rounded-md bg-footer text-fg-footer">
      {hero.image && <img src={hero.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="flex max-w-[80%] flex-col items-start gap-1.5 p-4 sm:p-6">
        <p className="font-display text-h4 leading-tight sm:text-h3">{hero.title.en || "Your headline"}</p>
        {hero.subtitle.en && <p className="text-caption opacity-90">{hero.subtitle.en}</p>}
        {hero.cta.en && <span className="rounded-full bg-surface px-3 py-1 text-caption text-fg-primary">{hero.cta.en}</span>}
      </div>
    </div>
  );
}

function HeroImage({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <FormField label="Background photo (optional)" hint="A wide photo works best. It's shrunk to WebP before it uploads.">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}>{url ? "Replace photo" : "+ Add photo"}</Button>
        {url && !busy && <Button variant="link" size="inline" className="text-fg-error" onClick={() => onChange(null)}>Remove</Button>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setBusy(true);
        const r = await uploadPhoto(file, "home");
        setBusy(false);
        if ("url" in r) onChange(r.url);
        else toast.error(r.error);
      }} />
    </FormField>
  );
}

/** Hero and the hand-picked product rows that sit above the full list on the store's home page. */
export function HomeTab({ home, products, onChange }: { home: Home; products: PickerProduct[]; onChange: (home: Home) => void }) {
  const [editing, setEditing] = useState<{ index: number | null; section: HomeSection } | null>(null);
  const setHero = (patch: Partial<Home["hero"]>) => onChange({ ...home, hero: { ...home.hero, ...patch } });
  const setSections = (sections: HomeSection[]) => onChange({ ...home, sections });
  const byId = new Map(products.map((p) => [p.id, p]));

  const move = (i: number, by: -1 | 1) => {
    const list = [...home.sections];
    [list[i], list[i + by]] = [list[i + by]!, list[i]!];
    setSections(list);
  };

  return (
    <div className="flex flex-col gap-4">
      <ContentCard padding="md" title="Hero" subtitle="A banner above the products. Off until you switch it on." action={<Switch aria-label="Show hero" checked={home.hero.enabled} onCheckedChange={(enabled) => setHero({ enabled })} />}>
        <HeroPreview hero={home.hero} />
        <div className={cn("flex flex-col gap-4 transition-opacity", !home.hero.enabled && "opacity-50")}>
          <TextPair label="Title" value={home.hero.title} onChange={(title) => setHero({ title })} />
          <TextPair label="Subtitle" value={home.hero.subtitle} onChange={(subtitle) => setHero({ subtitle })} />
          <TextPair label="Button (empty hides it)" value={home.hero.cta} onChange={(cta) => setHero({ cta })} />
          <HeroImage url={home.hero.image} onChange={(image) => setHero({ image })} />
        </div>
      </ContentCard>

      <ContentCard
        padding="md"
        title="Product sections"
        subtitle="Hand-picked rows above the full list, like “Best sellers” or “New this week”."
        action={<Button variant="secondary" onClick={() => setEditing({ index: null, section: { id: "", enabled: true, title: { bn: "", en: "" }, subtitle: { bn: "", en: "" }, productIds: [] } })}>+ Add section</Button>}
      >
        {home.sections.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong px-6 py-8 text-center text-body-sm text-fg-secondary">No sections yet. The store opens straight on all products.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {home.sections.map((section, i) => {
              const shown = section.productIds.filter((id) => byId.get(id)?.active).length;
              const label = section.title.en || section.title.bn || "Untitled section";
              return (
                <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-md border border-border bg-muted text-label-md text-fg-secondary">{i + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label-md text-fg-primary">{label}</span>
                    <span className="truncate text-caption text-fg-secondary">{section.productIds.length} {section.productIds.length === 1 ? "product" : "products"}{shown < section.productIds.length ? ` · ${shown} on the store` : ""}</span>
                  </div>
                  <StatusPill tone={section.enabled && shown > 0 ? "success" : "neutral"}>{!section.enabled ? "Hidden" : shown === 0 ? "Empty" : "Showing"}</StatusPill>
                  <Button variant="outline" size="sm" aria-label={`Edit ${label}`} onClick={() => setEditing({ index: i, section: structuredClone(section) })}>Edit</Button>
                  <Switch aria-label={`${label} on`} checked={section.enabled} onCheckedChange={(enabled) => setSections(home.sections.map((s, j) => (j === i ? { ...s, enabled } : s)))} />
                  <RowMenu
                    label={`More for ${label}`}
                    items={[
                      { label: "Move up", disabled: i === 0, onSelect: () => move(i, -1) },
                      { label: "Move down", disabled: i === home.sections.length - 1, onSelect: () => move(i, 1) },
                      { separator: true },
                      { label: "Delete", destructive: true, onSelect: () => confirm(`Delete “${label}”?`) && setSections(home.sections.filter((_, j) => j !== i)) },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </ContentCard>

      {editing && (
        <SectionModal
          key={editing.index ?? "new"}
          section={editing.section}
          isNew={editing.index === null}
          products={products}
          onCancel={() => setEditing(null)}
          onApply={(section) => {
            if (!section.title.bn.trim() || !section.title.en.trim()) return toast.error("Give the section a title in both languages.");
            setSections(editing.index === null ? [...home.sections, section] : home.sections.map((s, j) => (j === editing.index ? section : s)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** A section's titles and its products: search to add, reorder or remove what's in it. */
function SectionModal({ section, isNew, products, onCancel, onApply }: { section: HomeSection; isNew: boolean; products: PickerProduct[]; onCancel: () => void; onApply: (section: HomeSection) => void }) {
  const [s, setS] = useState(section);
  const [query, setQuery] = useState("");
  const byId = new Map(products.map((p) => [p.id, p]));
  const chosen = s.productIds.map((id) => byId.get(id)).filter((p): p is PickerProduct => Boolean(p));
  const term = query.trim().toLowerCase();
  const results = products.filter((p) => !s.productIds.includes(p.id) && (!term || p.name.en.toLowerCase().includes(term) || p.name.bn.includes(term)));
  const shift = (i: number, by: -1 | 1) => {
    const ids = [...s.productIds];
    [ids[i], ids[i + by]] = [ids[i + by]!, ids[i]!];
    setS({ ...s, productIds: ids });
  };
  const thumb = (p: PickerProduct) => (p.image ? <img src={p.image} alt="" className="size-10 shrink-0 rounded-sm object-cover" /> : <span className="size-10 shrink-0 rounded-sm bg-muted" />);
  const iconButton = "grid size-8 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-muted hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onCancel()}
      title={isNew ? "Add a section" : s.title.en || "Edit section"}
      description="Applied when you press Save changes."
      footer={<><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onApply(s)}>{isNew ? "Add section" : "Apply"}</Button></>}
    >
      <div className="flex flex-col gap-4">
        <TextPair label="Title" value={s.title} onChange={(title) => setS({ ...s, title })} placeholder={{ bn: "সেরা বিক্রি", en: "Best sellers" }} />
        <TextPair label="Subtitle (optional)" value={s.subtitle} onChange={(subtitle) => setS({ ...s, subtitle })} />

        <FormField label={`In this section · ${chosen.length}`}>
          {chosen.length === 0 ? (
            <p className="rounded-md border border-dashed border-border-strong px-4 py-4 text-center text-caption text-fg-tertiary">Nothing yet. Add products below.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {chosen.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  {thumb(p)}
                  <span className="min-w-0 flex-1 truncate text-body-sm">{p.name.en}{!p.active && <span className="ml-2 text-caption text-fg-tertiary">hidden</span>}</span>
                  <button type="button" disabled={i === 0} onClick={() => shift(i, -1)} aria-label="Move earlier" className={iconButton}><Icon name="chevronLeft" /></button>
                  <button type="button" disabled={i === chosen.length - 1} onClick={() => shift(i, 1)} aria-label="Move later" className={iconButton}><Icon name="chevronRight" /></button>
                  <button type="button" onClick={() => setS({ ...s, productIds: s.productIds.filter((id) => id !== p.id) })} aria-label={`Remove ${p.name.en}`} className={cn(iconButton, "hover:bg-error-soft hover:text-fg-error")}><Icon name="x" /></button>
                </li>
              ))}
            </ul>
          )}
        </FormField>

        <FormField label="Add products">
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products to add" />
          <ul className="max-h-60 overflow-y-auto rounded-md border border-border">
            {results.length === 0 ? (
              <li className="px-4 py-4 text-center text-caption text-fg-tertiary">{products.length === s.productIds.length ? "Every product is already here." : `Nothing matches “${query}”.`}</li>
            ) : results.map((p) => (
              <li key={p.id} className="border-b border-border last:border-b-0">
                <button type="button" onClick={() => setS({ ...s, productIds: [...s.productIds, p.id] })} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  {thumb(p)}
                  <span className="min-w-0 flex-1 truncate text-body-sm">{p.name.en}{!p.active && <span className="ml-2 text-caption text-fg-tertiary">hidden</span>}</span>
                  <span className="flex shrink-0 items-center gap-1 text-label-md text-fg-brand"><Icon name="plus" />Add</span>
                </button>
              </li>
            ))}
          </ul>
        </FormField>
      </div>
    </Modal>
  );
}
