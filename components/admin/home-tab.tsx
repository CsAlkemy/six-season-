"use client";

import { useId, useRef, useState } from "react";

import type { FaqItem, HomeSection, Settings, Text } from "@/lib/types";

import { Modal, RowMenu, SearchField, Switch, toast } from "./controls";
import { Input, TextArea, TextPair } from "./fields";
import { uploadPhoto } from "./image-upload";
import { Avatar, Button, Callout, cn, ContentCard, FormField, Icon, StatusPill } from "./ui";

export type PickerProduct = { id: string; name: { bn: string; en: string }; image: string | null; active: boolean };
type Home = Settings["home"];
type Review = Home["review"];

/** saveStoreSettings keeps no more than these. */
const MAX_POINTS = 4;
const MAX_FAQ = 12;

const blankText = (): Text => ({ bn: "", en: "" });
const iconButton = "grid size-8 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-muted hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent";
const removeButton = cn(iconButton, "hover:bg-error-soft hover:text-fg-error");

/** The list with item i swapped for its neighbour; callers disable the move at either end. */
function moved<T>(list: T[], i: number, by: -1 | 1): T[] {
  const next = [...list];
  [next[i], next[i + by]] = [next[i + by]!, next[i]!];
  return next;
}

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

/** Uploads to the home folder; the old photo is deleted from storage only once Save drops it. */
function PhotoField({ label, hint, url, onChange, thumb }: { label: string; hint: string; url: string | null; onChange: (url: string | null) => void; thumb?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <FormField label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-3">
        {thumb}
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

/** The ticks under the hero's title: a line in each language per point, in the order they show. */
function HeroPoints({ points, onChange }: { points: Text[]; onChange: (points: Text[]) => void }) {
  const set = (i: number, lang: keyof Text, value: string) => onChange(points.map((p, j) => (j === i ? { ...p, [lang]: value } : p)));
  return (
    <FormField label={`Checklist · ${points.length} of ${MAX_POINTS}`} hint="Short reasons to buy that the store stands behind, shown as ticks under the title.">
      {points.length > 0 && (
        <ol className="flex flex-col gap-3">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-2">
              <span aria-hidden className="mt-3 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-fg-brand max-sm:hidden"><Icon name="check" className="size-3.5" strokeWidth={3} /></span>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <input aria-label={`Point ${i + 1} in Bangla`} value={p.bn} maxLength={70} placeholder="বাংলা" onChange={(e) => set(i, "bn", e.target.value)} className="field" />
                <input aria-label={`Point ${i + 1} in English`} value={p.en} maxLength={70} placeholder="English" onChange={(e) => set(i, "en", e.target.value)} className="field" />
              </div>
              {/* Stacked beside the stacked inputs on phones, so the inputs keep their width. */}
              <div className="flex h-12 shrink-0 items-center max-sm:h-auto max-sm:flex-col max-sm:pt-1">
                <button type="button" disabled={i === 0} onClick={() => onChange(moved(points, i, -1))} aria-label={`Move point ${i + 1} up`} className={iconButton}><Icon name="chevronUp" /></button>
                <button type="button" disabled={i === points.length - 1} onClick={() => onChange(moved(points, i, 1))} aria-label={`Move point ${i + 1} down`} className={iconButton}><Icon name="chevronDown" /></button>
                <button type="button" onClick={() => onChange(points.filter((_, j) => j !== i))} aria-label={`Remove point ${i + 1}`} className={removeButton}><Icon name="x" /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div>
        <Button variant="secondary" size="sm" disabled={points.length >= MAX_POINTS} onClick={() => onChange([...points, blankText()])}>+ Add point</Button>
      </div>
    </FormField>
  );
}

/** One customer's own words, who they are and where they said it, with the pictures they agreed to show. */
function ReviewCard({ review, products, onChange }: { review: Review; products: PickerProduct[]; onChange: (patch: Partial<Review>) => void }) {
  const id = useId();
  return (
    <ContentCard
      padding="md"
      title="Featured review"
      subtitle="Use a real customer's words as they wrote them, with their permission to show their name and picture."
      action={<Switch aria-label="Show featured review" checked={review.enabled} onCheckedChange={(enabled) => onChange({ enabled })} />}
    >
      <div className={cn("flex flex-col gap-4 transition-opacity", !review.enabled && "opacity-50")}>
        <TextArea label="Their words" rows={4} maxLength={600} value={review.text} onChange={(text) => onChange({ text })} hint="Exactly as they wrote it, in whichever language. Up to 600 characters." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Customer's name" maxLength={60} value={review.name} onChange={(name) => onChange({ name })} />
          <Input label="Where they said it" maxLength={30} value={review.source} placeholder="Facebook, WhatsApp…" onChange={(source) => onChange({ source })} />
          <FormField label="Rating" htmlFor={`${id}-rating`}>
            <select id={`${id}-rating`} value={review.rating} onChange={(e) => onChange({ rating: Number(e.target.value) })} className="field">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "star" : "stars"}</option>)}
            </select>
          </FormField>
        </div>
        <TextPair label="Your one-line summary" maxLength={80} value={review.title} onChange={(title) => onChange({ title })} placeholder={{ bn: "স্বাদ আর ডেলিভারি, দুটোতেই খুশি", en: "Happy with the taste and the delivery" }} />
        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoField
            label="Their profile picture (optional)"
            hint="Without one, their initials show."
            url={review.avatar}
            onChange={(avatar) => onChange({ avatar })}
            thumb={review.avatar ? <img src={review.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover" /> : <Avatar name={review.name} className="size-12" />}
          />
          <PhotoField
            label="Their photo of the product (optional)"
            hint="Without one, their words run full width."
            url={review.photo}
            onChange={(photo) => onChange({ photo })}
            thumb={review.photo ? <img src={review.photo} alt="" className="size-12 shrink-0 rounded-md object-cover" /> : <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-md bg-muted text-fg-tertiary"><Icon name="image" className="size-5" /></span>}
          />
        </div>
        <FormField label="Product it's about" htmlFor={`${id}-product`} hint="Named on their photo and linked to its page.">
          <select id={`${id}-product`} value={review.productId} onChange={(e) => onChange({ productId: e.target.value })} className="field">
            <option value="">None</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name.en} · {p.name.bn}{p.active ? "" : " (hidden)"}</option>)}
          </select>
        </FormField>
      </div>
    </ContentCard>
  );
}

/** The store's own questions as a list like the sections': edit one in a dialog, reorder or delete from its menu. */
function FaqCard({ faq, onChange }: { faq: FaqItem[]; onChange: (faq: FaqItem[]) => void }) {
  const [editing, setEditing] = useState<{ index: number | null; item: FaqItem } | null>(null);
  return (
    <>
      <ContentCard
        padding="md"
        title="Questions & answers"
        subtitle={`Your own questions on the home page, up to ${MAX_FAQ}.`}
        // Like a new section, a new question gets its id from the save action.
        action={<Button variant="secondary" disabled={faq.length >= MAX_FAQ} onClick={() => setEditing({ index: null, item: { id: "", question: blankText(), answer: blankText() } })}>+ Add question</Button>}
      >
        <Callout>The home page already answers where you deliver and what it costs, how to pay, what happens if something is wrong, and the confirmation call, from your other settings. Add the questions only you can answer: which product suits whom, how to store it, where it comes from.</Callout>
        {faq.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong px-6 py-8 text-center text-body-sm text-fg-secondary">No questions of your own yet. The home page shows only the ones it answers from your settings.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {faq.map((item, i) => {
              const label = item.question.en || item.question.bn || "Untitled question";
              return (
                <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-md border border-border bg-muted text-label-md text-fg-secondary">{i + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label-md text-fg-primary">{label}</span>
                    <span className="truncate text-caption text-fg-secondary">{item.answer.en || item.answer.bn}</span>
                  </div>
                  <Button variant="outline" size="sm" aria-label={`Edit ${label}`} onClick={() => setEditing({ index: i, item: structuredClone(item) })}>Edit</Button>
                  <RowMenu
                    label={`More for ${label}`}
                    items={[
                      { label: "Move up", disabled: i === 0, onSelect: () => onChange(moved(faq, i, -1)) },
                      { label: "Move down", disabled: i === faq.length - 1, onSelect: () => onChange(moved(faq, i, 1)) },
                      { separator: true },
                      { label: "Delete", destructive: true, onSelect: () => confirm(`Delete “${label}”?`) && onChange(faq.filter((_, j) => j !== i)) },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </ContentCard>

      {editing && (
        <FaqModal
          key={editing.index ?? "new"}
          item={editing.item}
          isNew={editing.index === null}
          onCancel={() => setEditing(null)}
          onApply={(item) => {
            onChange(editing.index === null ? [...faq, item] : faq.map((f, j) => (j === editing.index ? item : f)));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

/** A question and its answer in both languages; Save would refuse one missing any of the four, so Apply does too. */
function FaqModal({ item, isNew, onCancel, onApply }: { item: FaqItem; isNew: boolean; onCancel: () => void; onApply: (item: FaqItem) => void }) {
  const [f, setF] = useState(item);
  const [error, setError] = useState("");
  const apply = () => {
    if (![f.question.bn, f.question.en, f.answer.bn, f.answer.en].every((t) => t.trim())) return setError("Write the question and its answer in both languages.");
    onApply(f);
  };
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onCancel()}
      title={isNew ? "Add a question" : f.question.en || "Edit question"}
      description="Applied when you press Save changes."
      footer={<><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={apply}>{isNew ? "Add question" : "Apply"}</Button></>}
    >
      <div className="flex flex-col gap-4">
        <TextPair label="Question" maxLength={160} value={f.question} onChange={(question) => setF({ ...f, question })} placeholder={{ bn: "ঘি কীভাবে রাখব?", en: "How should I keep the ghee?" }} />
        <TextPair label="Answer" rows={5} maxLength={800} value={f.answer} onChange={(answer) => setF({ ...f, answer })} />
        {error && <Callout tone="error">{error}</Callout>}
      </div>
    </Modal>
  );
}

/**
 * Hero, the hand-picked product rows, a customer's review and the store's own questions on the home page. Changes
 * arrive as updates to the latest draft, so a photo that finishes uploading doesn't undo what was typed meanwhile.
 */
export function HomeTab({ home, products, onChange }: { home: Home; products: PickerProduct[]; onChange: (update: (home: Home) => Home) => void }) {
  const [editing, setEditing] = useState<{ index: number | null; section: HomeSection } | null>(null);
  const setHero = (patch: Partial<Home["hero"]>) => onChange((h) => ({ ...h, hero: { ...h.hero, ...patch } }));
  const setSections = (sections: HomeSection[]) => onChange((h) => ({ ...h, sections }));
  const byId = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-4">
      <ContentCard padding="md" title="Hero" subtitle="A banner above the products. Off until you switch it on." action={<Switch aria-label="Show hero" checked={home.hero.enabled} onCheckedChange={(enabled) => setHero({ enabled })} />}>
        <HeroPreview hero={home.hero} />
        <div className={cn("flex flex-col gap-4 transition-opacity", !home.hero.enabled && "opacity-50")}>
          <TextPair label="Title" value={home.hero.title} onChange={(title) => setHero({ title })} />
          <TextPair label="Subtitle" value={home.hero.subtitle} onChange={(subtitle) => setHero({ subtitle })} />
          <TextPair label="Button (empty hides it)" value={home.hero.cta} onChange={(cta) => setHero({ cta })} />
          <PhotoField label="Background photo (optional)" hint="A wide photo works best. It's shrunk to WebP before it uploads." url={home.hero.image} onChange={(image) => setHero({ image })} />
          <HeroPoints points={home.hero.points} onChange={(points) => setHero({ points })} />
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
                      { label: "Move up", disabled: i === 0, onSelect: () => setSections(moved(home.sections, i, -1)) },
                      { label: "Move down", disabled: i === home.sections.length - 1, onSelect: () => setSections(moved(home.sections, i, 1)) },
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

      <ReviewCard review={home.review} products={products} onChange={(patch) => onChange((h) => ({ ...h, review: { ...h.review, ...patch } }))} />
      <FaqCard faq={home.faq} onChange={(faq) => onChange((h) => ({ ...h, faq }))} />

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
  const shift = (i: number, by: -1 | 1) => setS({ ...s, productIds: moved(s.productIds, i, by) });
  const thumb = (p: PickerProduct) => (p.image ? <img src={p.image} alt="" className="size-10 shrink-0 rounded-sm object-cover" /> : <span className="size-10 shrink-0 rounded-sm bg-muted" />);

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
                  <button type="button" onClick={() => setS({ ...s, productIds: s.productIds.filter((id) => id !== p.id) })} aria-label={`Remove ${p.name.en}`} className={removeButton}><Icon name="x" /></button>
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
