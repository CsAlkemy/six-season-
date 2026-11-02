import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostForm } from "@/components/admin/post-form";
import { loadPosts, loadProducts } from "@/lib/data";

export const metadata: Metadata = { title: "Post" };

export default async function EditPostPage({ params }: PageProps<"/admin/blog/[id]">) {
  const { id } = await params;
  const [posts, products] = await Promise.all([loadPosts(), loadProducts()]);
  const post = id === "new" ? null : posts.find((p) => p.id === id);
  if (post === undefined) notFound();
  return <PostForm post={post} products={products.map((p) => ({ id: p.id, name: p.name, image: p.image, active: p.active }))} key={post?.id ?? "new"} />;
}
