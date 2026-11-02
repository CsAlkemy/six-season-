import { isLive, postCover } from "@/lib/blog";
import { findPost, getPosts, getProducts } from "@/lib/data";
import { OG_SIZE, postCard } from "@/lib/og";
import { type Lang, LANGS } from "@/lib/types";

/** The picture when a post is shared: its banner (or its product's photo) and its title. */
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const alt = "মাটির কথা · মাটির টান";
export const revalidate = 3600;

/** Every language and post pair that's published; image routes don't get the layout's language handed down. */
export async function generateStaticParams() {
  const posts = await getPosts();
  return LANGS.flatMap((lang) => posts.filter((p) => isLive(p, lang)).map((p) => ({ lang, slug: p.slug })));
}

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const post = LANGS.includes(lang) ? await findPost(slug) : undefined;
  if (!post || !isLive(post, lang)) return new Response("Not found", { status: 404 });
  const card = await postCard(post.text[lang].title, lang, postCover(post, await getProducts()));
  return new Response(new Uint8Array(card), { headers: { "Content-Type": contentType } });
}
