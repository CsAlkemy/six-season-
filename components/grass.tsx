/**
 * A strip of grass and mustard flowers growing out of the footer's soil. Drawn once on the server
 * from a seeded random, so every render (and the static HTML) is the same; the sway is CSS only.
 */

const W = 1440;
const H = 160;

/** Olive and sage greens, darkest at the back, and the mustard yellows from the palette. */
const GREEN = { back: "#4e5c3a", mid: "#64744a", front: "#7a8b5c", tip: "#98a878" };
const MUSTARD = ["#f2cf6b", "#d9a21b"];
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

/** The soil line: a slow roll with a little wobble on it. */
const ground = (x: number) => 146 + 6 * Math.sin(x / 150) + 2.5 * Math.sin(x / 47);

function blades(rand: () => number, count: number, minH: number, maxH: number, minW: number, maxW: number) {
  return Array.from({ length: count }, () => {
    const x = rand() * W;
    const h = minH + rand() * (maxH - minH);
    const w = minW + rand() * (maxW - minW);
    const lean = (rand() - 0.5) * h * 0.5;
    const g = ground(x) + 6;
    const tx = x + lean;
    const ty = g - h;
    return `M${r1(x - w / 2)} ${r1(g)}Q${r1(x + lean * 0.35 - w * 0.2)} ${r1(g - h * 0.55)} ${r1(tx)} ${r1(ty)}Q${r1(x + lean * 0.35 + w * 0.2)} ${r1(g - h * 0.5)} ${r1(x + w / 2)} ${r1(g)}Z`;
  }).join("");
}

function mustard(rand: () => number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    // Spread across the width, jittered, so they never clump.
    const x = ((i + 0.2 + rand() * 0.6) / count) * W;
    const h = 70 + rand() * 60;
    const lean = (rand() - 0.5) * 24;
    const g = ground(x) + 6;
    const top = { x: x + lean, y: g - h };
    const buds = Array.from({ length: 6 }, (_, b) => ({
      cx: r1(top.x + Math.cos(b * 1.1 + rand()) * (4 + rand() * 6)),
      cy: r1(top.y + Math.sin(b * 1.1 + rand()) * (3 + rand() * 4)),
      r: r1(3 + rand() * 2.5),
      fill: MUSTARD[(b + i) % 2],
    }));
    return { stem: `M${r1(x)} ${r1(g)}Q${r1(x + lean * 0.2)} ${r1(g - h * 0.6)} ${r1(top.x)} ${r1(top.y)}`, buds };
  });
}

const rand = seeded(20261027);
const BACK = blades(rand, 170, 55, 125, 9, 16);
const MID = blades(rand, 150, 40, 95, 8, 14);
const FLOWERS = mustard(rand, 11);
const FRONT = blades(rand, 140, 22, 62, 7, 12);
const TIPS = blades(rand, 60, 18, 40, 5, 9);
const SOIL_LINE = `M0 ${H}` + Array.from({ length: 49 }, (_, i) => `L${i * 30} ${r1(ground(i * 30))}`).join("") + `L${W} ${H}Z`;

export function Grass({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className} aria-hidden focusable="false">
      <g className="grass-sway grass-sway-slow">
        <path d={BACK} fill={GREEN.back} />
      </g>
      <g className="grass-sway">
        <path d={MID} fill={GREEN.mid} />
      </g>
      <g className="grass-sway grass-sway-flowers">
        {FLOWERS.map(({ stem, buds }, i) => (
          <g key={i}>
            <path d={stem} fill="none" stroke={GREEN.back} strokeWidth="2.5" strokeLinecap="round" />
            {buds.map((bud, b) => (
              <circle key={b} {...bud} />
            ))}
          </g>
        ))}
      </g>
      <g className="grass-sway grass-sway-fast">
        <path d={FRONT} fill={GREEN.front} />
        <path d={TIPS} fill={GREEN.tip} />
      </g>
      <path d={SOIL_LINE} fill={SOIL} />
    </svg>
  );
}
