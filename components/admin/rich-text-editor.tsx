"use client";

import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { type Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

import { isOwnPhoto } from "@/lib/blog";

import { Modal, toast } from "./controls";
import { uploadPhoto } from "./image-upload";
import { Button, cn, FormField, Icon, type IconName, Spinner } from "./ui";

/**
 * A post's text, written the way it will read: the page uses the storefront's own post styles (.post-body), so
 * headings, notes and photos look here as they will on the blog. Photos upload as they go in (picked, pasted or
 * dropped), shrunk to WebP like product photos. The HTML is cleaned again on the server when the post is saved.
 */
export function RichTextEditor({ value, onChange, placeholder, label }: { value: string; onChange: (html: string) => void; placeholder: string; label: string }) {
  const [uploading, setUploading] = useState(0);
  const files = useRef<HTMLInputElement>(null);
  /** For the paste and drop handlers, which are set up before the editor exists. */
  const editorRef = useRef<Editor | null>(null);

  // Photos go in where the cursor is, one after another, each with its size so the page doesn't jump as they load.
  const insertPhotos = async (editor: Editor, picked: File[]) => {
    const images = picked.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploading((n) => n + images.length);
    for (const file of images) {
      const r = await uploadPhoto(file, "blog");
      setUploading((n) => n - 1);
      if ("error" in r) toast.error(r.error);
      else editor.chain().focus().setImage({ src: r.url, alt: "", width: r.width, height: r.height }).run();
    }
  };

  const editor = useEditor({
    // Rendered in the browser only; on the server there's no document to edit yet.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: { class: "post-body min-h-96 px-5 py-4 outline-none sm:px-7 sm:py-6", "aria-label": label },
      // Pasted pages often carry other sites' pictures; only uploads may go in a post.
      transformPastedHTML(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const foreign = [...doc.querySelectorAll("img")].filter((img) => !isOwnPhoto(img.getAttribute("src") ?? ""));
        foreign.forEach((img) => img.remove());
        if (foreign.length) toast.info("Pictures from other sites were left out. Save them and use the photo button to add them.");
        return doc.body.innerHTML;
      },
      handlePaste(_, event) {
        const pasted = [...(event.clipboardData?.files ?? [])];
        if (!pasted.some((f) => f.type.startsWith("image/")) || !editorRef.current) return false;
        void insertPhotos(editorRef.current, pasted);
        return true;
      },
      handleDrop(_, event) {
        const dropped = [...((event as DragEvent).dataTransfer?.files ?? [])];
        if (!dropped.some((f) => f.type.startsWith("image/")) || !editorRef.current) return false;
        event.preventDefault();
        void insertPhotos(editorRef.current, dropped);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Discard and switching posts hand in new text; typing comes back as the same text and is left alone.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="min-h-96 animate-pulse rounded-md border border-border-strong bg-muted" />;

  return (
    <div className="rounded-md border border-border-strong bg-surface focus-within:border-brand focus-within:ring-3 focus-within:ring-brand-soft">
      <Toolbar editor={editor} onPhoto={() => files.current?.click()} uploading={uploading} />
      <EditorContent editor={editor} />
      <input
        ref={files}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const picked = [...(e.target.files ?? [])];
          e.target.value = "";
          void insertPhotos(editor, picked);
        }}
      />
    </div>
  );
}

function Toolbar({ editor, onPhoto, uploading }: { editor: Editor; onPhoto: () => void; uploading: number }) {
  const [linking, setLinking] = useState<string | null>(null);
  const [describing, setDescribing] = useState<string | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bullets: e.isActive("bulletList"),
      numbers: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      image: e.isActive("image"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const tool = (icon: IconName, title: string, active: boolean, run: () => void, disabled = false) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={cn("grid size-9 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-30", active ? "bg-brand-soft text-fg-brand" : "text-fg-secondary hover:bg-muted hover:text-fg-primary")}
    >
      <Icon name={icon} className="size-4.5" />
    </button>
  );
  const gap = <span aria-hidden className="mx-1 h-6 w-px bg-border" />;

  const applyLink = (href: string) => {
    const url = href.trim();
    if (!url) chain().extendMarkRange("link").unsetLink().run();
    else if (editor.state.selection.empty && !state.link) chain().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    else chain().extendMarkRange("link").setLink({ href: url }).run();
    setLinking(null);
  };

  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-border bg-surface p-1.5">
      {tool("heading2", "Section heading", state.h2, () => chain().toggleHeading({ level: 2 }).run())}
      {tool("heading3", "Smaller heading", state.h3, () => chain().toggleHeading({ level: 3 }).run())}
      {gap}
      {tool("bold", "Bold", state.bold, () => chain().toggleBold().run())}
      {tool("italic", "Italic", state.italic, () => chain().toggleItalic().run())}
      {tool("underline", "Underline", state.underline, () => chain().toggleUnderline().run())}
      {gap}
      {tool("list", "Bulleted list", state.bullets, () => chain().toggleBulletList().run())}
      {tool("listOrdered", "Numbered list", state.numbers, () => chain().toggleOrderedList().run())}
      {tool("quote", "Note (green box)", state.quote, () => chain().toggleBlockquote().run())}
      {tool("divider", "Divider line", false, () => chain().setHorizontalRule().run())}
      {gap}
      {tool("link", "Link", state.link, () => setLinking(editor.getAttributes("link").href ?? ""))}
      {tool("image", "Add photos", false, onPhoto, uploading > 0)}
      {state.image && (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setDescribing(editor.getAttributes("image").alt ?? "")} className="rounded-md px-2.5 py-1.5 text-label-md text-fg-brand hover:bg-brand-soft">
          Describe photo
        </button>
      )}
      {uploading > 0 && (
        <span className="flex items-center gap-1.5 px-2 text-caption text-fg-secondary">
          <Spinner className="size-3.5" />
          Uploading {uploading}…
        </span>
      )}
      <span className="ml-auto flex">
        {tool("undo", "Undo", false, () => chain().undo().run(), !state.undo)}
        {tool("redo", "Redo", false, () => chain().redo().run(), !state.redo)}
      </span>

      <TextModal
        open={linking !== null}
        title="Link"
        label="Web address"
        hint="A page on this store (/bn/p/gawa-ghee) or any site (https://…). Leave it empty to remove the link."
        initial={linking ?? ""}
        onCancel={() => setLinking(null)}
        onApply={applyLink}
      />
      <TextModal
        open={describing !== null}
        title="Describe this photo"
        label="What it shows"
        hint="Read aloud to blind visitors and used by Google Images, e.g. খাঁটি গাওয়া ঘি একটা কাচের বয়ামে."
        initial={describing ?? ""}
        onCancel={() => setDescribing(null)}
        onApply={(alt) => {
          chain().updateAttributes("image", { alt: alt.trim() }).run();
          setDescribing(null);
        }}
      />
    </div>
  );
}

/** One field in a modal: the link's address, or a photo's description. */
function TextModal({ open, title, label, hint, initial, onCancel, onApply }: { open: boolean; title: string; label: string; hint: string; initial: string; onCancel: () => void; onApply: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial, open]);
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onApply(value)}>Apply</Button>
        </>
      }
    >
      <FormField label={label} htmlFor="editor-modal-field" hint={hint}>
        <input id="editor-modal-field" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onApply(value))} className="field" />
      </FormField>
    </Modal>
  );
}
