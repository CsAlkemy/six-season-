"use client";

import { useRef, useState } from "react";

import { discardUploads } from "@/app/admin/actions";
import { MAX_TESTIMONIAL_TEXT, MAX_TESTIMONIALS, MAX_VIDEO_MB } from "@/lib/testimonials";
import type { Testimonial } from "@/lib/types";

import { Modal, RowMenu, Switch, toast } from "./controls";
import { Input, TextArea } from "./fields";
import { uploadPhoto } from "./image-upload";
import { Avatar, Button, Callout, cn, ContentCard, FormField, Icon, StatusPill } from "./ui";
import { uploadVideo } from "./video-upload";

/** A new one is on: the admin is adding feedback they've already checked. It gets its id from the save action. */
const blank = (): Testimonial => ({ id: "", enabled: true, kind: "text", name: "", role: "", avatar: null, text: "", video: null, poster: null });

/** The list with item i swapped for its neighbour; callers disable the move at either end. */
function moved<T>(list: T[], i: number, by: -1 | 1): T[] {
  const next = [...list];
  [next[i], next[i + by]] = [next[i + by]!, next[i]!];
  return next;
}

/** The row's picture: a video's cover with a play mark, else their photo, else their initials. */
function Thumb({ item }: { item: Testimonial }) {
  if (item.kind === "video") {
    return (
      <span aria-hidden className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-neutral-900 text-fg-inverse">
        {item.poster && <img src={item.poster} alt="" className="absolute inset-0 size-full object-cover" />}
        <span className="relative grid size-6 place-items-center rounded-full bg-neutral-900/60"><Icon name="play" className="size-3" /></span>
      </span>
    );
  }
  return item.avatar ? <img src={item.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover" /> : <Avatar name={item.name} className="size-12" />;
}

/** Customer feedback for the home page's carousel, as a list like the sections': edit in a dialog, show or hide, reorder, delete. */
export function TestimonialsCard({ items, onChange }: { items: Testimonial[]; onChange: (items: Testimonial[]) => void }) {
  const [editing, setEditing] = useState<{ index: number | null; item: Testimonial } | null>(null);
  return (
    <>
      <ContentCard
        padding="md"
        title="Customer feedback"
        subtitle={`Customers' own words or a short video, in a carousel above the questions. Up to ${MAX_TESTIMONIALS}.`}
        action={<Button variant="secondary" disabled={items.length >= MAX_TESTIMONIALS} onClick={() => setEditing({ index: null, item: blank() })}>+ Add feedback</Button>}
      >
        <Callout>Add only feedback a customer really gave you, and ask before showing their name, photo or video. Switch one off to hide it without deleting it.</Callout>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong px-6 py-8 text-center text-body-sm text-fg-secondary">No feedback yet. The home page shows the carousel once one is on.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item, i) => {
              const label = item.name || "Unnamed customer";
              return (
                <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <Thumb item={item} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label-md text-fg-primary">
                      {label}
                      {item.role && <span className="font-normal text-fg-secondary"> · {item.role}</span>}
                    </span>
                    <span className="truncate text-caption text-fg-secondary">{item.kind === "video" ? "Video" : `“${item.text}”`}</span>
                  </div>
                  <StatusPill tone={item.enabled ? "success" : "neutral"}>{item.enabled ? "Showing" : "Hidden"}</StatusPill>
                  <Button variant="outline" size="sm" aria-label={`Edit ${label}`} onClick={() => setEditing({ index: i, item: structuredClone(item) })}>Edit</Button>
                  <Switch aria-label={`Show ${label}`} checked={item.enabled} onCheckedChange={(enabled) => onChange(items.map((t, j) => (j === i ? { ...t, enabled } : t)))} />
                  <RowMenu
                    label={`More for ${label}`}
                    items={[
                      { label: "Move up", disabled: i === 0, onSelect: () => onChange(moved(items, i, -1)) },
                      { label: "Move down", disabled: i === items.length - 1, onSelect: () => onChange(moved(items, i, 1)) },
                      { separator: true },
                      { label: "Delete", destructive: true, onSelect: () => confirm(`Delete ${label}'s feedback?`) && onChange(items.filter((_, j) => j !== i)) },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </ContentCard>

      {editing && (
        <TestimonialModal
          key={editing.index ?? "new"}
          item={editing.item}
          isNew={editing.index === null}
          onCancel={() => setEditing(null)}
          onApply={(item) => {
            onChange(editing.index === null ? [...items, item] : items.map((t, j) => (j === editing.index ? item : t)));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

/**
 * One customer's feedback: written or a video, their name and profession, and their photo. Photos and videos upload
 * as they're picked; ones that end up unused when the dialog closes (cancelled, replaced, or the kind switched) are
 * deleted again, since a video is too big to leave lying in storage.
 */
function TestimonialModal({ item, isNew, onCancel, onApply }: { item: Testimonial; isNew: boolean; onCancel: () => void; onApply: (item: Testimonial) => void }) {
  const [f, setF] = useState(item);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"photo" | "video" | null>(null);
  const [progress, setProgress] = useState(0);
  const fresh = useRef(new Set<string>());
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Testimonial>) => setF((prev) => ({ ...prev, ...patch }));
  const video = f.kind === "video";

  const discard = (urls: string[]) => {
    if (urls.length) void discardUploads(urls).catch(() => {});
  };
  const cancel = () => {
    discard([...fresh.current]);
    onCancel();
  };
  const apply = () => {
    if (!f.name.trim() || !f.role.trim()) return setError("Add their name and what they do.");
    if (!video && !f.text.trim()) return setError("Add their words.");
    if (video && !f.video) return setError("Upload their video.");
    const done: Testimonial = video ? { ...f, text: "" } : { ...f, video: null, poster: null };
    const kept = new Set([done.avatar, done.video, done.poster]);
    discard([...fresh.current].filter((url) => !kept.has(url)));
    onApply(done);
  };

  const pickPhoto = async (file: File) => {
    setBusy("photo");
    const r = await uploadPhoto(file, "home", 400);
    setBusy(null);
    if ("error" in r) return toast.error(r.error);
    fresh.current.add(r.url);
    set({ avatar: r.url });
  };
  const pickVideo = async (file: File) => {
    setError("");
    setProgress(0);
    setBusy("video");
    const r = await uploadVideo(file, setProgress);
    setBusy(null);
    if ("error" in r) return setError(r.error);
    fresh.current.add(r.video);
    if (r.poster) fresh.current.add(r.poster);
    set({ video: r.video, poster: r.poster });
  };

  return (
    <Modal
      open
      dismissible={!busy}
      onOpenChange={(o) => !o && cancel()}
      title={isNew ? "Add customer feedback" : f.name || "Edit feedback"}
      description="Applied when you press Save changes."
      footer={
        <>
          <Button variant="outline" disabled={Boolean(busy)} onClick={cancel}>Cancel</Button>
          <Button disabled={Boolean(busy)} onClick={apply}>{isNew ? "Add feedback" : "Apply"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Kind of feedback" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
          {(["text", "video"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={f.kind === kind}
              disabled={Boolean(busy)}
              onClick={() => set({ kind })}
              className={cn("flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-label-md transition-colors focus-visible:outline-2 focus-visible:outline-brand", f.kind === kind ? "bg-surface text-fg-primary shadow-card" : "text-fg-secondary hover:text-fg-primary")}
            >
              <Icon name={kind === "text" ? "messageQuote" : "play"} />
              {kind === "text" ? "Written" : "Video"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" maxLength={60} value={f.name} onChange={(name) => set({ name })} placeholder="Nusrat Jahan" />
          <Input label="Profession" maxLength={60} value={f.role} onChange={(role) => set({ role })} placeholder="Teacher, Rajshahi" />
        </div>

        <FormField label="Photo (optional)" hint="Their face, with their permission. Without one, their initials show.">
          <div className="flex flex-wrap items-center gap-4">
            {f.avatar ? <img src={f.avatar} alt="" className="size-14 rounded-full object-cover" /> : <Avatar name={f.name} className="size-14" />}
            <Button variant="outline" size="sm" loading={busy === "photo"} disabled={busy === "video"} onClick={() => photoInput.current?.click()}>{f.avatar ? "Replace photo" : "+ Add photo"}</Button>
            {f.avatar && !busy && <Button variant="link" size="inline" className="text-fg-error" onClick={() => set({ avatar: null })}>Remove</Button>}
          </div>
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void pickPhoto(file);
          }} />
        </FormField>

        {video ? (
          <FormField label="Video" hint={`Filmed upright on a phone, under ${MAX_VIDEO_MB} MB; 30 to 60 seconds is plenty. MP4 plays on every phone (on an iPhone: Settings › Camera › Formats › Most Compatible). A frame from it becomes the cover.`}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative grid aspect-[9/16] w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-neutral-900 text-fg-inverse/70">
                {f.poster ? (
                  <img src={f.poster} alt="" className="absolute inset-0 size-full object-cover" />
                ) : f.video ? (
                  <video src={`${f.video}#t=0.1`} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <Icon name="play" className="size-6" />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Button variant="outline" size="sm" loading={busy === "video"} disabled={busy === "photo"} onClick={() => videoInput.current?.click()}>{f.video ? "Replace video" : "+ Upload video"}</Button>
                {busy === "video" && (
                  <div className="flex items-center gap-2">
                    <div role="progressbar" aria-label="Uploading video" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-36 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-caption text-fg-secondary tabular-nums">{progress}%</span>
                  </div>
                )}
              </div>
            </div>
            <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void pickVideo(file);
            }} />
          </FormField>
        ) : (
          <TextArea
            label="Their words"
            rows={4}
            maxLength={MAX_TESTIMONIAL_TEXT}
            value={f.text}
            onChange={(text) => set({ text })}
            hint={`As they wrote it, in Bangla or English. Shorter feedback is set bigger on the card. ${f.text.length}/${MAX_TESTIMONIAL_TEXT}`}
          />
        )}

        {error && <Callout tone="error">{error}</Callout>}
      </div>
    </Modal>
  );
}
