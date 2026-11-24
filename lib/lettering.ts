/**
 * The hero's Bangla headline lettered in Li Alinur Niladri (Lipighor), drawn on the server as vector shapes.
 *
 * Lipighor's licence lets the font be used in any design but forbids putting the font file on a website
 * (assets/fonts/LICENSE-LiAlinurNiladri.txt), so it can't be a web font. Like a designer exporting a banner, the server
 * shapes the words with HarfBuzz and sends only their outlines, as one SVG; the font file never leaves the server.
 * The SVG is sized in em, so it follows the headline's font size, and shrinks as a whole on a screen too narrow for it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { type Face, face, glyphPath, shape } from "./shaping";

/** Space between lines, beyond the tallest mark above and the deepest below, as a share of the font size. */
const GAP = 0.06;

let loaded: Promise<Face | null> | undefined;

/** The font, read once per server; null when it can't be read, and the headline stays plain text. */
const font = () =>
  (loaded ??= readFile(path.join(process.cwd(), "assets/fonts/LiAlinurNiladri.ttf"))
    .then((data) => face(data))
    .catch(() => null));

export interface Lettering {
  /** In font units. */
  viewBox: string;
  /** The outlines, a group per line. */
  inner: string;
  /** In em of the headline's font size. */
  width: number;
  height: number;
}

/** Words into lines no wider than max (font units); a word wider than that has a line to itself. */
function wrap(f: Face, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && shape(f, next).advance > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Every coordinate in a glyph's path, x then y: HarfBuzz writes M, L, Q and C with absolute points only. */
const coordinates = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * The headline's lines (the admin's line breaks; any line wider than maxEm wraps) as one SVG. Every line gets the
 * same height, from the tallest vowel sign above to the deepest below across them all, so the baselines stay evenly
 * spaced. Null when the font can't be read or there's nothing to letter.
 */
export async function letter(lines: string[], maxEm: number): Promise<Lettering | null> {
  const f = await font();
  if (!f) return null;

  const rows = lines
    .flatMap((line) => wrap(f, line, maxEm * f.upem))
    .map((line) => {
      const { glyphs, advance } = shape(f, line);
      let top = 0;
      let bottom = 0;
      let left = 0;
      let right = advance;
      const paths = glyphs
        .map(({ id, x, y }) => {
          const d = glyphPath(f, id);
          if (!d) return "";
          const n = coordinates(d);
          for (let i = 0; i + 1 < n.length; i += 2) {
            left = Math.min(left, n[i]! + x);
            right = Math.max(right, n[i]! + x);
            top = Math.max(top, n[i + 1]! + y);
            bottom = Math.min(bottom, n[i + 1]! + y);
          }
          return `<path transform="translate(${x} ${y})" d="${d}"/>`;
        })
        .join("");
      return { paths, top, bottom, left, right };
    });
  if (!rows.length) return null;

  const ascent = Math.max(...rows.map((r) => r.top));
  const step = ascent - Math.min(...rows.map((r) => r.bottom)) + GAP * f.upem;
  const left = Math.min(...rows.map((r) => r.left));
  const width = Math.max(...rows.map((r) => r.right)) - left;
  const height = step * rows.length - GAP * f.upem;
  const inner = rows.map((r, i) => `<g transform="translate(0 ${round(ascent + i * step)}) scale(1 -1)">${r.paths}</g>`).join("");

  return { viewBox: `${round(left)} 0 ${round(width)} ${round(height)}`, inner, width: width / f.upem, height: height / f.upem };
}
