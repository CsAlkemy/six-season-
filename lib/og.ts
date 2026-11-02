/**
 * Share images (Open Graph, 1200×630 JPEG) for the home page and each product.
 *
 * next/og draws text with Satori, which can't shape Bangla: vowel signs land after their consonant and conjuncts
 * come apart. So text goes through HarfBuzz (the shaper browsers use) and becomes SVG paths, and sharp rasterises
 * the card. No system fonts are involved, so it renders the same on Vercel as on a laptop.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import * as hb from "harfbuzzjs";
import sharp from "sharp";

import { fromPrice, t, taka } from "./i18n";
import { readPhoto } from "./photo";
import { SITE_URL } from "./site";
import type { Lang, Product } from "./types";
import { defaultVariant, photosOf, variantsOf } from "./variants";

export const OG_SIZE = { width: 1200, height: 630 };
const { width: W, height: H } = OG_SIZE;

// The storefront's palette (app/globals.css).
const INK = "#463121";
const MUTED = "#7a6655";
const BRAND = "#168456";
const BRAND_SOFT = "#eaf6ef";
const RULE = "#ece4dc";

const DOMAIN = new URL(SITE_URL).hostname.replace(/^www\./, "");

interface Face {
  font: hb.Font;
  upem: number;
  paths: Map<number, string>;
  /** Kept so the font's face and data outlive it. */
  keep: unknown[];
}

function face(data: Buffer, weight?: number): Face {
  const blob = new hb.Blob(data);
  const hbFace = new hb.Face(blob);
  const font = new hb.Font(hbFace);
  if (weight) font.setVariations([new hb.Variation("wght", weight)]);
  return { font, upem: hbFace.upem, paths: new Map(), keep: [blob, hbFace] };
}

/** An SVG file's drawing, placed at any size by its viewBox. */
interface Art {
  viewBox: string;
  ratio: number;
  inner: string;
}

function art(svg: string): Art {
  const viewBox = svg.match(/viewBox="([^"]+)"/)![1]!;
  const [, , w, h] = viewBox.split(/\s+/).map(Number);
  return { viewBox, ratio: w! / h!, inner: svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "") };
}

const place = (a: Art, x: number, y: number, height: number) =>
  `<svg x="${x}" y="${y}" width="${height * a.ratio}" height="${height}" viewBox="${a.viewBox}">${a.inner}</svg>`;

let loaded: Promise<{ display: Face; body: Face; logo: Art; sprout: Art }> | undefined;

/** Fonts and artwork, read once per server. Baloo (headings, prices) and Hind (body) match the storefront. */
function assets() {
  return (loaded ??= (async () => {
    const [baloo, hind, logo, sprout] = await Promise.all([
      readFile(path.join(process.cwd(), "assets/fonts/BalooDa2.ttf")),
      readFile(path.join(process.cwd(), "assets/fonts/HindSiliguri-SemiBold.ttf")),
      readFile(path.join(process.cwd(), "public/logo.svg"), "utf8"),
      readFile(path.join(process.cwd(), "app/icon.svg"), "utf8"),
    ]);
    return { display: face(baloo, 700), body: face(hind), logo: art(logo), sprout: art(sprout) };
  })());
}

function shape(f: Face, text: string) {
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(f.font, buffer);
  const positions = buffer.getGlyphPositions();
  let pen = 0;
  const glyphs = buffer.getGlyphInfos().map((g, i) => {
    const p = positions[i]!;
    const glyph = { id: g.codepoint, x: pen + p.xOffset, y: p.yOffset };
    pen += p.xAdvance;
    return glyph;
  });
  return { glyphs, advance: pen };
}

const measure = (f: Face, text: string, size: number) => (shape(f, text).advance * size) / f.upem;

/** Text as SVG paths, the left end of its baseline at (x, y). */
function text(f: Face, value: string, x: number, y: number, size: number, fill: string): string {
  const paths = shape(f, value).glyphs.map(({ id, x: gx, y: gy }) => {
    let d = f.paths.get(id);
    if (d === undefined) f.paths.set(id, (d = f.font.glyphToPath(id)));
    return d ? `<path transform="translate(${gx} ${gy})" d="${d}"/>` : "";
  });
  const s = size / f.upem;
  return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${s} ${-s})">${paths.join("")}</g>`;
}

/** Words into lines no wider than maxWidth. */
function wrap(f: Face, value: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(f, next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The largest size at which the text fits in maxLines; past the smallest, the last line ends in "…". */
function fit(f: Face, value: string, sizes: number[], maxWidth: number, maxLines: number) {
  for (const size of sizes) {
    const lines = wrap(f, value, size, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes.at(-1)!;
  const lines = wrap(f, value, size, maxWidth).slice(0, maxLines);
  let last = lines[maxLines - 1]!;
  while (last.includes(" ") && measure(f, `${last}…`, size) > maxWidth) last = last.slice(0, last.lastIndexOf(" "));
  lines[maxLines - 1] = `${last}…`;
  return { size, lines };
}

/** A block of lines from the first baseline down; returns the SVG and the last baseline. */
function paragraph(f: Face, lines: string[], x: number, y: number, size: number, leading: number, fill: string) {
  return {
    svg: lines.map((line, i) => text(f, line, x, y + i * size * leading, size, fill)).join(""),
    bottom: y + (lines.length - 1) * size * leading,
  };
}

/** A photo cropped to fill a cell, or null when it can't be read. */
async function cell(src: string, width: number, height: number) {
  try {
    return await sharp(await readPhoto(src)).rotate().resize(width, height, { fit: "cover" }).toBuffer();
  } catch {
    return null;
  }
}

async function render(svg: string, photos: { input: Buffer; left: number; top: number }[]) {
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`))
    .composite(photos)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

/** The footer every card shares: cash on delivery, and the address to type in. */
function footer(f: { display: Face; body: Face }, lang: Lang, x: number, width: number) {
  const d = t(lang);
  return [
    `<rect x="${x}" y="${H - 132}" width="${width}" height="2" fill="${RULE}"/>`,
    text(f.body, d.codTitle, x, H - 84, 28, MUTED),
    text(f.display, DOMAIN, x, H - 44, 30, BRAND),
  ].join("");
}

/** A product: its photo on the left; the name, price and store on the right. */
export async function productCard(product: Product, lang: Lang): Promise<Buffer> {
  const a = await assets();
  const d = t(lang);
  const panelX = H; // the photo is a square on the left
  const x = panelX + 56;
  const maxWidth = W - x - 56;

  const cover = photosOf(product)[0];
  const photo = cover ? await cell(cover, H, H) : null;
  const variants = variantsOf(product);
  const variant = defaultVariant(product);
  const price = variants.length > 1 ? fromPrice(variant.price, lang) : taka(variant.price, lang);
  const unit = variants.length > 1 ? `· ${variants.length.toLocaleString(lang === "bn" ? "bn-BD" : "en")} ${d.sizes}` : `/ ${variant.label[lang]}`;

  const name = fit(a.display, product.name[lang], [68, 60, 52, 46], maxWidth, 3);
  const title = paragraph(a.display, name.lines, x, 228, name.size, 1.22, INK);
  const priceY = title.bottom + 84;
  const priceWidth = measure(a.display, price, 52);

  const svg = [
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
    photo ? "" : `<rect width="${H}" height="${H}" fill="${BRAND_SOFT}"/>${place(a.sprout, H / 2 - 150, H / 2 - 123, 246)}`,
    place(a.logo, x, 52, 84),
    title.svg,
    text(a.display, price, x, priceY, 52, BRAND),
    text(a.body, unit, x + priceWidth + 14, priceY, 30, MUTED),
    footer(a, lang, x, maxWidth),
  ].join("");
  return render(svg, photo ? [{ input: photo, left: 0, top: 0 }] : []);
}

/** A blog post: its cover photo on the left; the blog's name and the post's title on the right. */
export async function postCard(title: string, lang: Lang, cover?: string): Promise<Buffer> {
  const a = await assets();
  const x = H + 56;
  const maxWidth = W - x - 56;
  const photo = cover ? await cell(cover, H, H) : null;
  const heading = fit(a.display, title, [54, 48, 42], maxWidth, 4);

  const svg = [
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
    photo ? "" : `<rect width="${H}" height="${H}" fill="${BRAND_SOFT}"/>${place(a.sprout, H / 2 - 150, H / 2 - 123, 246)}`,
    place(a.logo, x, 52, 84),
    text(a.display, t(lang).blog, x, 202, 30, BRAND),
    paragraph(a.display, heading.lines, x, 270, heading.size, 1.22, INK).svg,
    footer(a, lang, x, maxWidth),
  ].join("");
  return render(svg, photo ? [{ input: photo, left: 0, top: 0 }] : []);
}

/** The store: logo, tagline and description on the left; up to four product photos on the right. */
export async function storeCard(products: Product[], lang: Lang, description: string): Promise<Buffer> {
  const a = await assets();
  const d = t(lang);
  const x = 64;
  const panelWidth = 600;
  const maxWidth = panelWidth - x * 2;

  // A mosaic in the right half, 6px apart: one photo fills it, two split it, three or four make a grid.
  const covers = products.map((p) => photosOf(p)[0]).filter((src): src is string => Boolean(src)).slice(0, 4);
  const half = (W - panelWidth - 6) / 2;
  const row = (H - 6) / 2;
  const layouts: [number, number, number, number][][] = [
    [],
    [[0, 0, 600, H]],
    [[0, 0, half, H], [half + 6, 0, half, H]],
    [[0, 0, half, H], [half + 6, 0, half, row], [half + 6, row + 6, half, row]],
    [[0, 0, half, row], [half + 6, 0, half, row], [0, row + 6, half, row], [half + 6, row + 6, half, row]],
  ];
  const cells = layouts[covers.length]!;
  const photos = (
    await Promise.all(
      cells.map(async ([cx, cy, cw, ch], i) => {
        const input = await cell(covers[i]!, Math.round(cw), Math.round(ch));
        return input && { input, left: Math.round(panelWidth + cx), top: Math.round(cy) };
      }),
    )
  ).filter((p) => p !== null);

  const tagline = fit(a.display, d.tagline, [64, 56, 48], maxWidth, 2);
  const head = paragraph(a.display, tagline.lines, x, 236, tagline.size, 1.2, INK);
  const about = fit(a.body, description, [27, 25], maxWidth, 3);
  const body = paragraph(a.body, about.lines, x, head.bottom + 58, about.size, 1.45, MUTED);

  const svg = [
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
    photos.length ? "" : `<rect x="${panelWidth}" width="${W - panelWidth}" height="${H}" fill="${BRAND_SOFT}"/>${place(a.sprout, panelWidth + 150, H / 2 - 123, 246)}`,
    place(a.logo, x, 52, 100),
    head.svg,
    body.svg,
    footer(a, lang, x, maxWidth),
  ].join("");
  return render(svg, photos);
}
