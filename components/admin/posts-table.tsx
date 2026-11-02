"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deletePost } from "@/app/admin/actions";
import { isLive, type Post, postDate } from "@/lib/blog";
import { LANGS } from "@/lib/types";

import { Button, EmptyState, Icon, StatusPill } from "./ui";
import { DataTable, Modal, RowMenu, toast, type Column } from "./controls";

export type PostRow = { post: Post; cover?: string };

const title = (post: Post) => post.text.bn.title || post.text.en.title || "Untitled";

function Thumb({ cover }: { cover?: string }) {
  return cover ? <img src={cover} alt="" className="h-11 w-16 shrink-0 rounded-md object-cover" /> : <span className="grid h-11 w-16 shrink-0 place-items-center rounded-md bg-muted text-fg-tertiary"><Icon name="image" /></span>;
}

/** Which languages a post is written in, and whether it's out or a draft. */
function Status({ post }: { post: Post }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusPill tone={post.active ? "success" : "neutral"}>{post.active ? "Published" : "Draft"}</StatusPill>
      {LANGS.filter((l) => post.text[l].title).map((l) => (
        <span key={l} className={`rounded-sm px-1.5 text-caption ${isLive(post, l) ? "bg-brand-soft text-fg-brand" : "bg-muted text-fg-tertiary"}`}>{l === "bn" ? "বাংলা" : "EN"}</span>
      ))}
    </span>
  );
}

/** The blog's posts, newest first: each opens its editor; the menu can view or delete it. */
export function PostsTable({ rows, filtered }: { rows: PostRow[]; filtered: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [removing, setRemoving] = useState<Post | null>(null);
  const edit = (post: Post) => router.push(`/admin/blog/${post.id}`);
  const liveLang = (post: Post) => LANGS.find((l) => isLive(post, l));

  const remove = () =>
    removing &&
    start(async () => {
      const r = await deletePost(removing.id);
      if (r.ok) toast.success("Post deleted");
      else toast.error(r.error);
      setRemoving(null);
      router.refresh();
    });

  const columns: Column<PostRow>[] = [
    {
      key: "post", header: "Post",
      cell: ({ post, cover }) => (
        <Link href={`/admin/blog/${post.id}`} className="flex items-center gap-3 hover:text-fg-brand">
          <Thumb cover={cover} />
          <span className="min-w-0">
            <span className="block truncate text-label-md">{title(post)}</span>
            {post.text.bn.title && post.text.en.title && <span className="block truncate text-caption text-fg-secondary">{post.text.en.title}</span>}
          </span>
        </Link>
      ),
    },
    { key: "status", header: "Status", width: "w-52", cell: ({ post }) => <Status post={post} /> },
    { key: "date", header: "Date", width: "w-40", cell: ({ post }) => <span className="text-fg-secondary">{postDate(post.updated ?? post.published, "en")}</span> },
    {
      key: "menu", header: <span className="sr-only">Actions</span>, width: "w-16",
      cell: ({ post }) => {
        const lang = liveLang(post);
        return (
          <RowMenu
            label={`More for ${title(post)}`}
            items={[
              { label: "Edit", onSelect: () => edit(post) },
              ...(lang ? [{ label: "View on the blog", onSelect: () => window.open(`/${lang}/blog/${post.slug}`, "_blank") }] : []),
              { separator: true as const },
              { label: "Delete", destructive: true, onSelect: () => setRemoving(post) },
            ]}
          />
        );
      },
    },
  ];

  const empty = <EmptyState title={filtered ? "No posts here" : "No posts yet"}>{filtered ? "Try another tab." : "Write the first one to bring readers in from Google."}</EmptyState>;

  return (
    <>
      <div className="max-lg:hidden">
        <DataTable label="Posts" columns={columns} rows={rows} rowKey={(r) => r.post.id} onRowClick={(r) => edit(r.post)} empty={empty} busy={busy} minWidth="min-w-180" />
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface lg:hidden">
        {rows.length === 0 && <li className="p-4">{empty}</li>}
        {rows.map(({ post, cover }) => (
          <li key={post.id}>
            <Link href={`/admin/blog/${post.id}`} className="flex items-center gap-3 p-4">
              <Thumb cover={cover} />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-label-md">{title(post)}</span>
                <Status post={post} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Modal
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Delete “${removing ? title(removing) : ""}”?`}
        description="It leaves the blog and its photos are removed. This can't be undone."
        footer={<><Button variant="outline" onClick={() => setRemoving(null)}>Keep it</Button><Button loading={busy} onClick={remove}>Delete post</Button></>}
      />
    </>
  );
}
