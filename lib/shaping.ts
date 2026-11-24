/**
 * Text shaped by HarfBuzz (the shaper browsers use) and drawn as SVG paths, for text that has to look exactly so
 * without the visitor's browser having the font: the share images (lib/og.ts) and the hero's Bangla lettering
 * (lib/lettering.ts). Bangla needs the real shaping: vowel signs move before their consonant and conjuncts join.
 */
import * as hb from "harfbuzzjs";

export interface Face {
  font: hb.Font;
  upem: number;
  paths: Map<number, string>;
  /** Kept so the font's face and data outlive it. */
  keep: unknown[];
}

export function face(data: Buffer, weight?: number): Face {
  const blob = new hb.Blob(data);
  const hbFace = new hb.Face(blob);
  const font = new hb.Font(hbFace);
  if (weight) font.setVariations([new hb.Variation("wght", weight)]);
  return { font, upem: hbFace.upem, paths: new Map(), keep: [blob, hbFace] };
}

/** The glyphs for a run of text, each at its pen position, in font units. */
export function shape(f: Face, text: string) {
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

export const measure = (f: Face, text: string, size: number) => (shape(f, text).advance * size) / f.upem;

/** A glyph's outline as SVG path data in font units (y up), worked out once per face. */
export function glyphPath(f: Face, id: number): string {
  let d = f.paths.get(id);
  if (d === undefined) f.paths.set(id, (d = f.font.glyphToPath(id)));
  return d;
}
