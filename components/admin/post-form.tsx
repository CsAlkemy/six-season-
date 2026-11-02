"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { deletePost, savePost, type PostDraft } from "@/app/admin/actions";
import { htmlText, isLive, type Post } from "@/lib/blog";
import { LANGS, type Lang } from "@/lib/types";

import { Checkbox, Modal, SwitchRow, toast } from "./controls";
import type { PickerProduct } from "./home-tab";
import { uploadPhoto } from "./image-upload";
import { RichTextEditor } from "./rich-text-editor";
import { Button, Callout, cn, ContentCard, FormField, Icon, LinkButton, PageBody, PageHeader, Spinner } from "./ui";

const LANG_NAME: Record<Lang, string> = { bn: "বাংলা", en: "English" };
const blankText = () => ({ title: "", description: "", html: "" });

function draftOf(post: Post | null): PostDraft {
  if (!post) return { id: "", slug: "", active: false, image: null, products: [], text: { bn: blankText(), en: blankText() } };
  return { id: post.id, slug: post.slug, active: post.active, image: post.image, products: post.products, text: post.text };
}

const slugOf = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/**
 * Motherhood's two columns, as for a product: the banner and the post itself (title, summary and text, in Bangla
 * and English) on the left; whether it's on the blog, the products it's about, and its search listing beside them.
 */
export function PostForm({ post, products }: { post: Post | null; products: PickerProduct[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => draftOf(post));
  const [draft, setDraft] = useState(saved);
  const [lang, setLang] = useState<Lang>("bn");
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bannerInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (patch: Partial<PostDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setText = (to: Lang, patch: Partial<PostDraft["text"][Lang]>) => setDraft((d) => ({ ...d, text: { ...d.text, [to]: { ...d.text[to], ...patch } } }));
  const written = (to: Lang) => Boolean(draft.text[to].title.trim() || htmlText(draft.text[to].html));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const addBanner = async (file: File) => {
    setUploading(true);
    const r = await uploadPhoto(file, "blog");
    setUploading(false);
    if ("error" in r) toast.error(r.error);
    else set({ image: r.url });
  };

  const onSave = () =>
    start(async () => {
      const r = await savePost(draft);
      if (!r.ok) return toast.error(r.error);
      toast.success(draft.active ? "Saved. The blog updates within a minute." : "Saved as a draft");
      if (!post) return router.replace(`/admin/blog/${r.id}`);
      setSaved(draft);
      router.refresh();
    });

  const onDelete = () =>
    start(async () => {
      const r = await deletePost(draft.id);
      if (r.ok) {
        toast.success("Post deleted");
        router.replace("/admin/blog");
      } else toast.error(r.error);
    });

  const name = draft.text.bn.title || draft.text.en.title || "New post";
  const slug = draft.slug || slugOf(draft.text.en.title);
  // "View on the blog" opens the saved version, in a language it's published in.
  const liveIn = post ? LANGS.find((l) => isLive(post, l)) : undefined;
  const text = draft.text[lang];

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ label: "Blog", href: "/admin/blog" }, { label: post ? name : "New post" }]}
        title={post ? name : "New post"}
        actions={
          <>
            {liveIn && (
              <LinkButton variant="outline" href={`/${liveIn}/blog/${post!.slug}`} target="_blank">
                <Icon name="external" />
                View on the blog
              </LinkButton>
            )}
            <Button variant="outline" disabled={!dirty || pending} onClick={() => setDraft(saved)}>Discard</Button>
            <Button loading={pending} disabled={uploading || (!dirty && Boolean(post))} onClick={onSave}>{post ? "Save changes" : "Save post"}</Button>
          </>
        }
      />
      {dirty && post && <Callout>You have unsaved changes.</Callout>}

      <div className="flex items-start gap-4 max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-4 max-lg:w-full">
          <ContentCard title="Banner" action={<span className="text-caption text-fg-secondary">Atop the post, on its card and when it's shared</span>}>
            {draft.image ? (
              <div className="relative overflow-hidden rounded-md border border-border">
                <img src={draft.image} alt="Banner" className="aspect-[16/9] w-full object-cover" />
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => bannerInput.current?.click()}>{uploading ? <Spinner /> : "Replace"}</Button>
                  <Button variant="outline" size="sm" onClick={() => set({ image: null })}>Remove</Button>
                </div>
              </div>
            ) : (
              <button type="button" disabled={uploading} onClick={() => bannerInput.current?.click()} className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-brand bg-brand-subtle text-label-md text-fg-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
                {uploading ? <Spinner className="size-5" /> : <Icon name="image" className="size-6" />}
                {uploading ? "Uploading…" : "Add a banner"}
                <span className="text-caption text-fg-secondary">A wide photo works best. Without one, the first product's photo is used.</span>
              </button>
            )}
            <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void addBanner(file); }} />
          </ContentCard>

          <ContentCard
            title="Post"
            action={
              <div role="tablist" aria-label="Language" className="flex rounded-full bg-muted p-1">
                {LANGS.map((l) => (
                  <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={cn("flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-md transition-colors focus-visible:outline-2 focus-visible:outline-brand", lang === l ? "bg-surface text-fg-primary shadow-card" : "text-fg-secondary hover:text-fg-primary")}>
                    {LANG_NAME[l]}
                    {written(l) && <span aria-label="written" className="size-1.5 rounded-full bg-brand" />}
                  </button>
                ))}
              </div>
            }
          >
            <p className="text-caption text-fg-secondary">
              {lang === "bn" ? "The Bangla blog shows the post when it has a title and text here." : "Optional. Leave English empty and the post shows on the Bangla blog only."}
            </p>
            <FormField label={`Title · ${LANG_NAME[lang]}`} htmlFor={`title-${lang}`}>
              <input id={`title-${lang}`} value={text.title} onChange={(e) => setText(lang, { title: e.target.value })} placeholder={lang === "bn" ? "খাঁটি ঘি চেনার ৬টি ঘরোয়া উপায়" : "6 ways to tell pure ghee at home"} className="field text-body-lg" />
            </FormField>
            <FormField label={`Summary · ${LANG_NAME[lang]} (optional)`} htmlFor={`summary-${lang}`} hint="One or two lines under the title, on the blog's list and in Google. Empty uses the start of the text.">
              <textarea id={`summary-${lang}`} rows={2} value={text.description} onChange={(e) => setText(lang, { description: e.target.value })} className="field" />
            </FormField>
            <FormField label={`Text · ${LANG_NAME[lang]}`}>
              {/* Both stay mounted so each keeps its own undo history; the other language waits hidden. */}
              {LANGS.map((l) => (
                <div key={l} hidden={l !== lang}>
                  <RichTextEditor
                    value={draft.text[l].html}
                    onChange={(html) => setText(l, { html })}
                    label={`Text in ${l === "bn" ? "Bangla" : "English"}`}
                    placeholder={l === "bn" ? "লিখতে শুরু করুন… শিরোনাম, তালিকা, ছবি সব ওপরের বোতামে।" : "Start writing… headings, lists and photos are in the bar above."}
                  />
                </div>
              ))}
            </FormField>
          </ContentCard>
        </div>

        <div className="flex w-85 shrink-0 flex-col gap-4 max-lg:w-full">
          <ContentCard title="Status">
            <SwitchRow label="Published" description={draft.active ? "On the blog" : "A draft until you turn this on"} checked={draft.active} onCheckedChange={(active) => set({ active })} />
          </ContentCard>

          <ContentCard title="Products in this post">
            <p className="text-caption text-fg-secondary">Their cards follow the post, so readers can order from it.</p>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {products.map((p) => {
                const on = draft.products.includes(p.id);
                return (
                  <li key={p.id}>
                    <label className="flex items-center gap-3 px-3 py-2">
                      <Checkbox checked={on} onChange={() => set({ products: on ? draft.products.filter((id) => id !== p.id) : [...draft.products, p.id] })} />
                      {p.image ? <img src={p.image} alt="" className="size-9 shrink-0 rounded-sm object-cover" /> : <span className="size-9 shrink-0 rounded-sm bg-muted" />}
                      <span className="min-w-0 flex-1 truncate text-body-sm">
                        {p.name.en}
                        {!p.active && <span className="ml-2 text-caption text-fg-tertiary">hidden</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ContentCard>

          <ContentCard title="Search listing">
            <FormField
              label="URL"
              htmlFor="slug"
              hint={slug ? "English letters, numbers and dashes. Empty uses the English title." : "With no English title, give it a short URL in English letters, e.g. ilish-fry. Otherwise it gets a code like post-1a2b3c."}
            >
              <input id="slug" value={draft.slug} placeholder={slug || "ilish-fry"} onChange={(e) => set({ slug: e.target.value })} className="field" />
            </FormField>
            <div className="flex flex-col gap-0.5 rounded-md bg-muted p-3">
              <p className="truncate text-caption text-fg-success">matirtaan.com.bd/{lang}/blog/{slug || "…"}</p>
              <p className="truncate text-label-md text-fg-brand">{text.title || "Post title"}</p>
              <p className="line-clamp-2 text-caption text-fg-secondary">{text.description || htmlText(text.html).slice(0, 160) || "The summary shows here in search results."}</p>
            </div>
          </ContentCard>

          {post && <Button variant="outline" className="w-full text-fg-error hover:bg-error-soft" onClick={() => setConfirmDelete(true)}>Delete post</Button>}
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${name}”?`}
        description="It leaves the blog and its photos are removed. This can't be undone."
        footer={<><Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button><Button loading={pending} onClick={onDelete}>Delete post</Button></>}
      />
    </PageBody>
  );
}
