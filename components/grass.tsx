import { SEASONS, type Season } from "@/lib/types";

/**
 * A strip of grass growing out of the footer's soil, with the season's plants among it: krishnachura in Grishma,
 * kadam in Barsha, kash in Sharat, ripe paddy in Hemanta, mustard in Sheet, shimul in Basanta. Drawn once on the
 * server from a seeded random, so every render (and the static HTML) is the same. All six are in the markup and CSS
 * shows the one <html data-season> names, along with that season's grass colours; the sway is CSS only.
 *
 * The field is one 1440-wide tile that repeats left and right of itself, so a wide screen gets more field instead of
 * a stretched one (stretching to fill the width cropped the tops off); H leaves room above the tallest plumes.
 */

const W = 1440;
const H = 190;

const SOIL = "var(--color-footer)";

/** mulberry32: tiny, seedable, good enough for scattering blades. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** The soil line: a slow roll with a little wobble on it, both periods dividing W so the tiles meet without a seam. */
const ground = (x: number) =>
  176 +
  6 * Math.sin((x / W) * Math.PI * 4) +
  2.5 * Math.sin((x / W) * Math.PI * 30);

function blades(
  rand: () => number,
  count: number,
  minH: number,
  maxH: number,
  minW: number,
  maxW: number,
) {
  // One blade per even slot, jittered within it, so the field never opens a bare gap.
  return Array.from({ length: count }, (_, i) => {
    const x = ((i + rand()) / count) * W;
    const h = minH + rand() * (maxH - minH);
    const w = minW + rand() * (maxW - minW);
    const lean = (rand() - 0.5) * h * 0.5;
    const g = ground(x) + 6;
    const tx = x + lean;
    const ty = g - h;
    return `M${r1(x - w / 2)} ${r1(g)}Q${r1(x + lean * 0.35 - w * 0.2)} ${r1(g - h * 0.55)} ${r1(tx)} ${r1(ty)}Q${r1(x + lean * 0.35 + w * 0.2)} ${r1(g - h * 0.5)} ${r1(x + w / 2)} ${r1(g)}Z`;
  }).join("");
}

/** Shapes as path data, so a whole season's flowers of one colour are a single <path>. */
const circle = (cx: number, cy: number, r: number) =>
  `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;

/** An ellipse whose long axis `rx` points along `deg`. */
function ellipse(cx: number, cy: number, rx: number, ry: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [rx * Math.cos(a), rx * Math.sin(a)];
  const arc = `A${r1(rx)} ${r1(ry)} ${r1(deg)} 1 0`;
  return `M${r1(cx - dx)} ${r1(cy - dy)}${arc} ${r1(cx + dx)} ${r1(cy + dy)}${arc} ${r1(cx - dx)} ${r1(cy - dy)}Z`;
}

type Stem = {
  x: number;
  g: number;
  h: number;
  lean: number;
  top: { x: number; y: number };
};

/** Stems spread across the width, jittered so they never clump. */
function stems(
  rand: () => number,
  count: number,
  minH: number,
  maxH: number,
  maxLean: number,
): Stem[] {
  return Array.from({ length: count }, (_, i) => {
    const x = ((i + 0.2 + rand() * 0.6) / count) * W;
    const h = minH + rand() * (maxH - minH);
    const lean = (rand() - 0.5) * maxLean;
    const g = ground(x) + 6;
    return { x, g, h, lean, top: { x: x + lean, y: g - h } };
  });
}

const stemPath = ({ x, g, h, lean, top }: Stem) =>
  `M${r1(x)} ${r1(g)}Q${r1(x + lean * 0.2)} ${r1(g - h * 0.6)} ${r1(top.x)} ${r1(top.y)}`;

type Plants = {
  stems: string;
  stemWidth: number;
  heads: Record<string, string>;
};

/** Collects head shapes by fill colour. */
function painter() {
  const heads: Record<string, string> = {};
  return {
    heads,
    paint: (fill: string, d: string) =>
      void (heads[fill] = (heads[fill] ?? "") + d),
  };
}

function mustard(rand: () => number): Plants {
  const list = stems(rand, 11, 70, 130, 24);
  const { heads, paint } = painter();
  list.forEach(({ top }, i) => {
    for (let b = 0; b < 6; b++) {
      const cx = top.x + Math.cos(b * 1.1 + rand()) * (4 + rand() * 6);
      const cy = top.y + Math.sin(b * 1.1 + rand()) * (3 + rand() * 4);
      paint(
        ["#f2cf6b", "#d9a21b"][(b + i) % 2]!,
        circle(cx, cy, 3 + rand() * 2.5),
      );
    }
  });
  return { stems: list.map(stemPath).join(""), stemWidth: 2.5, heads };
}

/** Krishnachura: loose clusters of flame-red and orange petals. */
function krishnachura(rand: () => number): Plants {
  const list = stems(rand, 12, 65, 115, 26);
  const { heads, paint } = painter();
  for (const { top } of list) {
    for (let p = 0; p < 11; p++) {
      const a = rand() * Math.PI * 2;
      const d = 2 + rand() * 10;
      paint(
        p % 3 ? "#e4572e" : "#f08a24",
        ellipse(
          top.x + Math.cos(a) * d,
          top.y + Math.sin(a) * d * 0.7,
          4.6,
          2.8,
          (a * 180) / Math.PI,
        ),
      );
    }
    paint("#f2cf6b", circle(top.x, top.y, 2));
  }
  return { stems: list.map(stemPath).join(""), stemWidth: 2.2, heads };
}

/** Kadam: golden balls flecked with cream, a pair of leaves on each stem. */
function kadam(rand: () => number): Plants {
  const list = stems(rand, 9, 70, 120, 20);
  const { heads, paint } = painter();
  for (const { x, g, h, top } of list) {
    paint("#e39a2d", circle(top.x, top.y, 8 + rand() * 1.5));
    for (let f = 0; f < 9; f++) {
      const a = f * 0.7 + rand();
      const d = 2 + rand() * 4.5;
      paint(
        "#fff1cf",
        circle(top.x + Math.cos(a) * d, top.y + Math.sin(a) * d, 1.1),
      );
    }
    const ly = g - h * (0.45 + rand() * 0.15);
    paint(
      "var(--grass-mid)",
      ellipse(x - 9, ly, 10, 3.6, 25) + ellipse(x + 9, ly - 4, 10, 3.6, -25),
    );
  }
  return { stems: list.map(stemPath).join(""), stemWidth: 2.2, heads };
}

/** Kash: tall, thin stems under feathery plumes that fan out and nod with the stem's lean. */
function kash(rand: () => number): Plants {
  const list = stems(rand, 15, 95, 145, 40);
  const { heads, paint } = painter();
  for (const { h, lean, top } of list) {
    const tilt = -90 + (lean / h) * 90;
    for (let f = -3; f <= 3; f++) {
      const deg = tilt + f * 9 + (rand() - 0.5) * 6;
      const len = 15 + rand() * 6 - Math.abs(f) * 1.5;
      const a = (deg * Math.PI) / 180;
      const [cx, cy] = [top.x + Math.cos(a) * len, top.y + Math.sin(a) * len];
      paint(f % 2 ? "#ddd5c3" : "#f4f0e6", ellipse(cx, cy, len, 2.4, deg));
    }
  }
  return { stems: list.map(stemPath).join(""), stemWidth: 1.6, heads };
}

/** Ripe paddy: heavy golden ears bowing off the top of each stalk. */
function paddy(rand: () => number): Plants {
  const list = stems(rand, 20, 60, 110, 30);
  const { heads, paint } = painter();
  let ears = "";
  for (const { lean, top } of list) {
    const dir = lean >= 0 ? 1 : -1;
    let prev = top;
    ears += `M${r1(top.x)} ${r1(top.y)}`;
    for (let k = 1; k <= 7; k++) {
      const next = {
        x: top.x + dir * k * 3.8,
        y: top.y + k * 2.4 + k * k * 0.4,
      };
      const deg =
        (Math.atan2(next.y - prev.y, next.x - prev.x) * 180) / Math.PI;
      paint(
        k % 2 ? "#d9a21b" : "#ebc35a",
        ellipse(next.x, next.y, 4.2, 2.4, deg + dir * 25),
      );
      ears += `L${r1(next.x)} ${r1(next.y)}`;
      prev = next;
    }
  }
  return { stems: list.map(stemPath).join("") + ears, stemWidth: 1.8, heads };
}

/** Shimul: five crimson petals around a yellow eye. */
function shimul(rand: () => number): Plants {
  const list = stems(rand, 10, 70, 125, 22);
  const { heads, paint } = painter();
  list.forEach(({ top }, i) => {
    const turn = rand() * 72;
    for (let p = 0; p < 5; p++) {
      const deg = turn + p * 72;
      const a = (deg * Math.PI) / 180;
      paint(
        i % 2 ? "#c8372d" : "#dd4b35",
        ellipse(
          top.x + Math.cos(a) * 5.5,
          top.y + Math.sin(a) * 5.5,
          6,
          3.6,
          deg,
        ),
      );
    }
    paint("#f2cf6b", circle(top.x, top.y, 2.4));
  });
  return { stems: list.map(stemPath).join(""), stemWidth: 2.2, heads };
}

const rand = seeded(20261027);
const BACK = blades(rand, 170, 55, 125, 9, 16);
const MID = blades(rand, 150, 40, 95, 8, 14);
const SHEET = mustard(rand);
const FRONT = blades(rand, 140, 22, 62, 7, 12);
const TIPS = blades(rand, 60, 18, 40, 5, 9);
const SOIL_LINE =
  `M0 ${H}` +
  Array.from({ length: 49 }, (_, i) => `L${i * 30} ${r1(ground(i * 30))}`).join(
    "",
  ) +
  `L${W} ${H}Z`;

const PLANTS: Record<Season, Plants> = {
  grishma: krishnachura(seeded(1)),
  barsha: kadam(seeded(2)),
  sharat: kash(seeded(3)),
  hemanta: paddy(seeded(4)),
  sheet: SHEET,
  basanta: shimul(seeded(6)),
};

export function Grass({ className = "" }: { className?: string }) {
  return (
    // Three tiles wide (the middle one drawn, the sides <use> copies), centred, so up to 3×W never runs out of field.
    <svg
      viewBox={`${-W} 0 ${3 * W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className={`grass ${className}`}
      aria-hidden
      focusable="false"
    >
      <use href="#grass-tile" x={-W} />
      <use href="#grass-tile" x={W} />
      <g id="grass-tile">
        <g className="grass-sway grass-sway-slow">
          <path d={BACK} className="grass-back" />
        </g>
        <g className="grass-sway">
          <path d={MID} className="grass-mid" />
        </g>
        <g className="grass-sway grass-sway-flowers">
          {SEASONS.map((season) => (
            <g key={season} data-grass-season={season}>
              <path
                d={PLANTS[season].stems}
                fill="none"
                className="grass-stem"
                strokeWidth={PLANTS[season].stemWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {Object.entries(PLANTS[season].heads).map(([fill, d]) => (
                <path key={fill} d={d} fill={fill} />
              ))}
            </g>
          ))}
        </g>
        <g className="grass-sway grass-sway-fast">
          <path d={FRONT} className="grass-front" />
          <path d={TIPS} className="grass-tip" />
        </g>
        <path d={SOIL_LINE} fill={SOIL} />
      </g>
    </svg>
  );
}
