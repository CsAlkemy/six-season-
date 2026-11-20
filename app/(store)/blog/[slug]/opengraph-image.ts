import { isLive, postCover } from "@/lib/blog";
import { findPost, getPosts, getProducts } from "@/lib/data";
import { OG_SIZE, postCard } from "@/lib/og";
import { STORE_LANG } from "@/lib/types";

/** The picture when a post is shared: its banner (or its product's photo) and its title. */
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const alt = "Notes from the soil · Matir Taan";
export const revalidate = 3600;

/** Every post published in the store's language. */
export async function generateStaticParams() {
  return (await getPosts()).filter((p) => isLive(p, STORE_LANG)).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const lang = STORE_LANG;
  const post = await findPost((await params).slug);
  if (!post || !isLive(post, lang)) return new Response("Not found", { status: 404 });
  const card = await postCard(post.text[lang].title, lang, postCover(post, await getProducts()));
  return new Response(new Uint8Array(card), { headers: { "Content-Type": contentType } });
}
