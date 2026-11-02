import type { Metadata } from "next";

import { PostsTable } from "@/components/admin/posts-table";
import { LinkButton, PageBody, PageHeader, Tabs } from "@/components/admin/ui";
import { newestFirst, postCover } from "@/lib/blog";
import { loadPosts, loadProducts } from "@/lib/data";

export const metadata: Metadata = { title: "Blog" };

const TABS = ["all", "published", "drafts"] as const;
const LABEL = { all: "All", published: "Published", drafts: "Drafts" } as const;

/** মাটির কথা in the admin: every post, drafts included, newest first. */
export default async function BlogAdminPage({ searchParams }: PageProps<"/admin/blog">) {
  const query = (await searchParams) as { tab?: string };
  const tab = TABS.find((t) => t === query.tab) ?? "all";
  const [posts, products] = await Promise.all([loadPosts(), loadProducts()]);
  const match = { all: () => true, published: (active: boolean) => active, drafts: (active: boolean) => !active } as const;
  const rows = newestFirst(posts)
    .filter((p) => match[tab](p.active))
    .map((post) => ({ post, cover: postCover(post, products) }));

  return (
    <PageBody>
      <PageHeader title="Blog" description="মাটির কথা: posts that bring readers in from Google and Facebook" actions={<LinkButton href="/admin/blog/new">+ New post</LinkButton>} />
      <Tabs label="Post status" items={TABS.map((t) => ({ href: t === "all" ? "/admin/blog" : `/admin/blog?tab=${t}`, label: LABEL[t], count: posts.filter((p) => match[t](p.active)).length, active: tab === t }))} />
      <PostsTable rows={rows} filtered={tab !== "all"} />
    </PageBody>
  );
}
