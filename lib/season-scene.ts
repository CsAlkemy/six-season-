/**
 * The season across the whole page, drawn with three.js. Two canvases share this code: the back one holds the sky
 * (gradient, sun, clouds, fog, lightning) and the season's particles at every depth; the front one, over the content
 * but under the header, carries a few large, near, soft ones so the season reaches past the cards. Particles move
 * entirely in the vertex shader from a seed and the clock, so a frame costs the CPU a handful of uniforms.
 */
import * as THREE from "three";

import type { Season } from "./types";

// The shaders work in plain sRGB, the same space the hex colours below are written in.
THREE.ColorManagement.enabled = false;

type Tex = "leaf" | "petal" | "streak" | "fluff" | "dot";

interface Drift {
  tex: Tex;
  /** Particles on a 1440×900 screen; scaled by area. `front` of them go on the front canvas instead. */
  count: number;
  front: number;
  /** Sprite size in CSS px, smallest to largest. */
  size: [number, number];
  /** Base velocity, px/s, y down. */
  fall: [number, number];
  /** Side-to-side sway: amplitude px, frequency Hz. */
  sway: [number, number];
  /** Spin rad/s; flip tumbles the sprite like a leaf turning over; align points it along its fall (rain). */
  spin: number;
  flip?: boolean;
  align?: boolean;
  colors: [string, string];
  alpha: number;
}

interface Sky {
  top: string;
  bottom: string;
  sun: [number, number];
  sunColor: string;
  sunSize: number;
  sunStrength: number;
  cloud: number;
  cloudColor: string;
  cloudSpeed: number;
  fog: number;
  fogColor: string;
  /** Chance of a lightning flash per second. */
  storm: number;
}

export const SCENES: Record<Season, { sky: Sky; drifts: Drift[] }> = {
  // Grishma: a white-hot sun, haze, and kalboishakhi gusts throwing krishnachura petals and dust across the page.
  grishma: {
    sky: { top: "#f9d8a6", bottom: "#fff6e6", sun: [0.84, 0.1], sunColor: "#ffb04a", sunSize: 0.38, sunStrength: 1, cloud: 0.12, cloudColor: "#fff3dc", cloudSpeed: 0.02, fog: 0.18, fogColor: "#ffe9c4", storm: 0 },
    drifts: [
      { tex: "petal", count: 70, front: 8, size: [12, 26], fall: [140, 55], sway: [40, 0.5], spin: 2.2, flip: true, colors: ["#e4572e", "#f08a24"], alpha: 0.95 },
      { tex: "leaf", count: 18, front: 3, size: [18, 32], fall: [170, 70], sway: [50, 0.4], spin: 2.6, flip: true, colors: ["#6a9440", "#8aa84a"], alpha: 0.9 },
      { tex: "dot", count: 110, front: 0, size: [3, 8], fall: [30, -10], sway: [20, 0.3], spin: 0, colors: ["#ffc46b", "#fff0c0"], alpha: 0.7 },
    ],
  },
  // Barsha: a low, moving overcast, slanting rain at every depth, and now and then lightning.
  barsha: {
    sky: { top: "#8fa1b2", bottom: "#dfe6ec", sun: [0.5, -0.4], sunColor: "#dfe8f0", sunSize: 0.3, sunStrength: 0, cloud: 0.8, cloudColor: "#6f7f8e", cloudSpeed: 0.06, fog: 0.35, fogColor: "#e6edf2", storm: 0.06 },
    drifts: [
      { tex: "streak", count: 650, front: 50, size: [22, 58], fall: [-140, 1150], sway: [0, 0], spin: 0, align: true, colors: ["#4f6f8c", "#7d98b0"], alpha: 0.55 },
      { tex: "dot", count: 50, front: 0, size: [2, 5], fall: [-40, 300], sway: [6, 1], spin: 0, colors: ["#b7c8d6", "#ffffff"], alpha: 0.5 },
    ],
  },
  // Sharat: the clearest blue of the year, white clouds sailing, kash fluff floating up.
  sharat: {
    sky: { top: "#7fbbe8", bottom: "#f1f8fd", sun: [0.14, 0.08], sunColor: "#fff6d8", sunSize: 0.28, sunStrength: 0.7, cloud: 0.55, cloudColor: "#ffffff", cloudSpeed: 0.015, fog: 0.08, fogColor: "#ffffff", storm: 0 },
    drifts: [
      { tex: "fluff", count: 60, front: 6, size: [14, 34], fall: [28, -38], sway: [36, 0.25], spin: 0.4, colors: ["#ffffff", "#efe7d4"], alpha: 0.95 },
      { tex: "dot", count: 60, front: 0, size: [2, 6], fall: [18, -20], sway: [20, 0.2], spin: 0, colors: ["#ffffff", "#fff6d8"], alpha: 0.8 },
    ],
  },
  // Hemanta: low golden light after the harvest, a little haze, dry leaves and paddy chaff coming down.
  hemanta: {
    sky: { top: "#efc27a", bottom: "#fbf0da", sun: [0.76, 0.28], sunColor: "#ff9f3d", sunSize: 0.42, sunStrength: 0.85, cloud: 0.22, cloudColor: "#ffe2b0", cloudSpeed: 0.01, fog: 0.3, fogColor: "#fbe6c0", storm: 0 },
    drifts: [
      { tex: "leaf", count: 55, front: 6, size: [16, 32], fall: [40, 75], sway: [70, 0.35], spin: 1.2, flip: true, colors: ["#c98a2b", "#b5652a"], alpha: 0.95 },
      { tex: "dot", count: 90, front: 0, size: [3, 7], fall: [20, 35], sway: [25, 0.4], spin: 0, colors: ["#e6b443", "#fbe3a0"], alpha: 0.75 },
    ],
  },
  // Sheet: a pale sun behind thick morning fog rolling over the fields, dew in the air, mustard petals.
  sheet: {
    sky: { top: "#d4dce3", bottom: "#f6f7f6", sun: [0.5, 0.16], sunColor: "#fff1d0", sunSize: 0.3, sunStrength: 0.45, cloud: 0.15, cloudColor: "#ffffff", cloudSpeed: 0.008, fog: 0.85, fogColor: "#ffffff", storm: 0 },
    drifts: [
      { tex: "dot", count: 160, front: 0, size: [2, 7], fall: [10, 22], sway: [18, 0.2], spin: 0, colors: ["#ffffff", "#dbe6ee"], alpha: 0.9 },
      { tex: "petal", count: 24, front: 3, size: [9, 16], fall: [30, 45], sway: [40, 0.3], spin: 1, flip: true, colors: ["#f2cf6b", "#e9b928"], alpha: 0.9 },
    ],
  },
  // Basanta: a pink-gold morning, shimul and palash petals falling, pollen in the light.
  basanta: {
    sky: { top: "#f9cfc4", bottom: "#fbf8ee", sun: [0.2, 0.14], sunColor: "#ffd27a", sunSize: 0.34, sunStrength: 0.75, cloud: 0.25, cloudColor: "#fff1ea", cloudSpeed: 0.012, fog: 0.12, fogColor: "#fff4ec", storm: 0 },
    drifts: [
      { tex: "petal", count: 75, front: 8, size: [12, 26], fall: [35, 70], sway: [55, 0.35], spin: 1.4, flip: true, colors: ["#d4402f", "#e8673c"], alpha: 0.95 },
      { tex: "dot", count: 90, front: 0, size: [2, 6], fall: [15, -12], sway: [25, 0.3], spin: 0, colors: ["#f2cf6b", "#ffffff"], alpha: 0.8 },
    ],
  },
};

/** White sprites drawn once on a 2D canvas; the shader tints them with the drift's colours. */
function sprite(kind: Tex) {
  const n = 64;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  g.translate(n / 2, n / 2);
  if (kind === "dot") {
    const r = g.createRadialGradient(0, 0, 0, 0, 0, n / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.35, "rgba(255,255,255,.7)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(-n / 2, -n / 2, n, n);
  } else if (kind === "streak") {
    const l = g.createLinearGradient(0, -n / 2, 0, n / 2);
    l.addColorStop(0, "rgba(255,255,255,0)");
    l.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = l;
    g.fillRect(-1.2, -n / 2, 2.4, n);
  } else if (kind === "fluff") {
    g.strokeStyle = "rgba(255,255,255,.85)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const len = 18 + (i % 3) * 5;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(Math.cos(a + 0.3) * len * 0.5, Math.sin(a + 0.3) * len * 0.5, Math.cos(a) * len, Math.sin(a) * len);
      g.stroke();
    }
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 12);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(-12, -12, 24, 24);
  } else {
    // Leaf and petal: an almond with a lighter tip, the leaf with a darker midrib.
    const w = kind === "leaf" ? 13 : 16;
    g.beginPath();
    g.moveTo(0, -28);
    g.bezierCurveTo(w * 1.6, -14, w, 18, 0, 28);
    g.bezierCurveTo(-w, 18, -w * 1.6, -14, 0, -28);
    const l = g.createLinearGradient(0, -28, 0, 28);
    l.addColorStop(0, "#ffffff");
    l.addColorStop(1, kind === "leaf" ? "#c8c8c8" : "#dcdcdc");
    g.fillStyle = l;
    g.fill();
    if (kind === "leaf") {
      g.strokeStyle = "rgba(90,90,90,.8)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(0, -24);
      g.lineTo(0, 30);
      g.stroke();
    }
  }
  return new THREE.CanvasTexture(c);
}

const DRIFT_VERT = /* glsl */ `
  attribute vec4 aSeed;
  attribute float aDepth;
  uniform float uTime, uDpr, uParallax, uSpin, uFlip, uAlign;
  uniform vec2 uRes, uFall, uSize, uSway, uOffset;
  uniform float uScroll;
  varying float vAngle, vFlip, vDepth, vTone;
  void main() {
    float d = aDepth;
    float speed = mix(0.45, 1.15, d) * mix(0.8, 1.2, aSeed.w);
    float size = mix(uSize.x, uSize.y, aSeed.w) * mix(0.5, 1.0, d);
    float pad = size + 40.0;
    vec2 span = uRes + 2.0 * pad;
    vec2 vel = uFall * speed;
    vec2 p = aSeed.xy * span + vel * uTime + uOffset * mix(0.35, 1.0, d);
    p.x += sin(uTime * 6.2832 * uSway.y * (0.7 + aSeed.z * 0.6) + aSeed.z * 6.2832) * uSway.x * mix(0.5, 1.0, d);
    // Scrolling slides the near ones further than the far, so the page has depth as you read down it.
    p.y -= uScroll * uParallax * mix(0.15, 0.9, d);
    p = mod(p, span) - pad;
    gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
    gl_PointSize = size * uDpr;
    vAngle = uAlign > 0.5 ? -atan(vel.x, vel.y) : aSeed.z * 6.2832 + uTime * uSpin * (aSeed.w - 0.5) * 2.0;
    vFlip = mix(1.0, cos(uTime * (1.0 + aSeed.y * 2.0) + aSeed.x * 6.2832), uFlip);
    vDepth = d;
    vTone = fract(aSeed.x * 7.13 + aSeed.y * 3.7);
  }
`;

const DRIFT_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3 uColorA, uColorB;
  uniform float uAlpha, uOpacity, uBlur;
  varying float vAngle, vFlip, vDepth, vTone;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vAngle), k = cos(vAngle);
    c = mat2(k, -s, s, k) * c;
    // Squeezing x by the flip makes a leaf look like it turns over as it falls.
    c.x /= max(abs(vFlip), 0.12);
    if (abs(c.x) > 0.5 || abs(c.y) > 0.5) discard;
    vec4 t = texture2D(uTex, c + 0.5, uBlur);
    vec3 col = mix(uColorA, uColorB, step(0.5, vTone)) * t.rgb;
    col *= vFlip < 0.0 ? 0.78 : 1.0;
    float a = t.a * uAlpha * uOpacity * mix(0.45, 1.0, vDepth);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop, uBottom, uSunColor, uCloudColor, uFogColor;
  uniform vec2 uSun, uRes;
  uniform float uTime, uSunSize, uSunStrength, uCloud, uCloudSpeed, uFog, uFlash, uScroll;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float aspect = uRes.x / uRes.y;
    vec3 col = mix(uTop, uBottom, smoothstep(0.0, 1.0, uv.y));
    // Sun: a soft core and a wide glow, breathing slowly.
    vec2 ds = (uv - uSun) * vec2(aspect, 1.0);
    float r = length(ds);
    float breathe = 1.0 + 0.06 * sin(uTime * 0.6);
    float glow = exp(-r / (uSunSize * 0.45 * breathe)) * 0.75 + smoothstep(uSunSize * 0.16, uSunSize * 0.1, r);
    float rays = 0.5 + 0.5 * sin(atan(ds.y, ds.x) * 14.0 + uTime * 0.15);
    glow += exp(-r / uSunSize) * rays * 0.18;
    col = mix(col, uSunColor, clamp(glow * uSunStrength, 0.0, 1.0));
    // Clouds drift with the time and lift a little as the page scrolls; thicker toward the top.
    vec2 q = vec2(uv.x * aspect, uv.y) * 2.2 + vec2(uTime * uCloudSpeed, uScroll * 0.0004);
    float n = fbm(q + fbm(q * 0.5 + uTime * uCloudSpeed * 0.5));
    float band = mix(1.0, 0.45, uv.y);
    float cl = smoothstep(1.0 - uCloud * 0.75, 1.05 - uCloud * 0.35, n * band + uCloud * 0.25);
    vec3 cloudCol = mix(uCloudColor, uCloudColor * 1.25 + 0.05, smoothstep(0.4, 0.9, n));
    col = mix(col, cloudCol, cl * clamp(uCloud * 1.4, 0.0, 0.95));
    // Fog banks roll along the lower half.
    float f = fbm(vec2(uv.x * aspect * 1.4 - uTime * 0.02, uv.y * 3.0 + uTime * 0.01));
    float fogMask = smoothstep(0.15, 1.0, uv.y) * smoothstep(0.3, 0.75, f);
    col = mix(col, uFogColor, fogMask * uFog);
    col += uFlash * vec3(0.55, 0.6, 0.7);
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Layer {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  opacity: number;
  target: number;
}

export interface Stage {
  setSeason(season: Season, instant?: boolean): void;
  setMotion(on: boolean): void;
  dispose(): void;
}

/** Builds one canvas's scene. `front` draws only the near drifts and no sky. */
export function createStage(canvas: HTMLCanvasElement, front: boolean): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: front, antialias: false, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const textures = new Map<Tex, THREE.Texture>();
  const tex = (k: Tex) => textures.get(k) ?? (textures.set(k, sprite(k)), textures.get(k)!);

  const res = new THREE.Vector2();
  const shared = {
    uTime: { value: 0 },
    uRes: { value: res },
    uDpr: { value: 1 },
    uScroll: { value: 0 },
    uOffset: { value: new THREE.Vector2() },
  };

  let skyMat: THREE.ShaderMaterial | null = null;
  const skyTarget = SCENES.sheet.sky;
  if (!front) {
    const u = (v: unknown) => ({ value: v });
    skyMat = new THREE.ShaderMaterial({
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: SKY_FRAG,
      uniforms: {
        uTime: shared.uTime,
        uRes: shared.uRes,
        uScroll: shared.uScroll,
        uTop: u(new THREE.Color(skyTarget.top)),
        uBottom: u(new THREE.Color(skyTarget.bottom)),
        uSunColor: u(new THREE.Color(skyTarget.sunColor)),
        uCloudColor: u(new THREE.Color(skyTarget.cloudColor)),
        uFogColor: u(new THREE.Color(skyTarget.fogColor)),
        uSun: u(new THREE.Vector2(...skyTarget.sun)),
        uSunSize: u(skyTarget.sunSize),
        uSunStrength: u(skyTarget.sunStrength),
        uCloud: u(skyTarget.cloud),
        uCloudSpeed: u(skyTarget.cloudSpeed),
        uFog: u(skyTarget.fog),
        uFlash: u(0),
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat);
    quad.frustumCulled = false;
    quad.renderOrder = -1;
    scene.add(quad);
  }

  let layers: Layer[] = [];
  let sky: Sky = skyTarget;

  function build(drift: Drift): Layer | null {
    const area = (res.x * res.y) / (1440 * 900);
    const count = Math.round((front ? drift.front : drift.count) * (front ? 1 : Math.min(1.4, Math.max(0.35, area))));
    if (!count) return null;
    const seeds = new Float32Array(count * 4);
    const depth = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < 4; j++) seeds[i * 4 + j] = Math.random();
      // The front canvas only holds the nearest: bigger, faster, slightly blurred.
      depth[i] = front ? 1 : Math.pow(Math.random(), 1.6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    geometry.setAttribute("aDepth", new THREE.BufferAttribute(depth, 1));
    const scale = front ? 2.2 : 1;
    const material = new THREE.ShaderMaterial({
      vertexShader: DRIFT_VERT,
      fragmentShader: DRIFT_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...shared,
        uTex: { value: tex(drift.tex) },
        uFall: { value: new THREE.Vector2(drift.fall[0] * (front ? 1.5 : 1), drift.fall[1] * (front ? 1.5 : 1)) },
        uSize: { value: new THREE.Vector2(drift.size[0] * scale, drift.size[1] * scale) },
        uSway: { value: new THREE.Vector2(drift.sway[0] * (front ? 1.6 : 1), drift.sway[1]) },
        uSpin: { value: drift.spin },
        uFlip: { value: drift.flip ? 1 : 0 },
        uAlign: { value: drift.align ? 1 : 0 },
        uParallax: { value: front ? 0.6 : 0.35 },
        uColorA: { value: new THREE.Color(drift.colors[0]) },
        uColorB: { value: new THREE.Color(drift.colors[1]) },
        uAlpha: { value: drift.alpha * (front ? 0.55 : 1) },
        uOpacity: { value: 0 },
        uBlur: { value: front ? 1.5 : 0 },
      },
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    return { points, material, opacity: 0, target: 1 };
  }

  function drop(layer: Layer) {
    scene.remove(layer.points);
    layer.points.geometry.dispose();
    layer.material.dispose();
  }

  // Sizing a canvas's buffer clears it and moves the sky and every drift to a new aspect, so it only happens when the
  // canvas box really changes. That box (100% × 100lvh) holds still as a phone's toolbars slide away and back while
  // you scroll, which window "resize" doesn't: it fires for each of those.
  let size = "";
  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (size === `${w}x${h}@${dpr}`) return false;
    size = `${w}x${h}@${dpr}`;
    if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    res.set(w, h);
    shared.uDpr.value = dpr;
    return true;
  }
  resize();

  // Wind: the pointer's sideways speed pushes everything, then it settles back.
  let wind = 0;
  let lastX: number | null = null;
  const onMove = (e: PointerEvent) => {
    if (lastX !== null) wind = Math.max(-500, Math.min(500, wind + (e.clientX - lastX) * 4));
    lastX = e.clientX;
  };
  const onScroll = () => (shared.uScroll.value = scrollY);
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  let motion = true;
  let raf = 0;
  let last = performance.now();
  let flash = 0;
  const color = new THREE.Color();

  function step(dt: number) {
    shared.uTime.value += dt;
    wind *= Math.exp(-dt * 1.5);
    shared.uOffset.value.x += wind * dt;
    const ease = 1 - Math.exp(-dt * 2.5);
    layers = layers.filter((l) => {
      l.opacity += (l.target - l.opacity) * ease;
      l.material.uniforms.uOpacity.value = l.opacity;
      const gone = l.target === 0 && l.opacity < 0.01;
      if (gone) drop(l);
      return !gone;
    });
    if (skyMat) {
      const u = skyMat.uniforms;
      for (const key of ["top", "bottom", "sunColor", "cloudColor", "fogColor"] as const) {
        const name = { top: "uTop", bottom: "uBottom", sunColor: "uSunColor", cloudColor: "uCloudColor", fogColor: "uFogColor" }[key];
        (u[name].value as THREE.Color).lerp(color.set(sky[key]), ease);
      }
      (u.uSun.value as THREE.Vector2).lerp(new THREE.Vector2(...sky.sun), ease);
      for (const [name, key] of [["uSunSize", "sunSize"], ["uSunStrength", "sunStrength"], ["uCloud", "cloud"], ["uCloudSpeed", "cloudSpeed"], ["uFog", "fog"]] as const) {
        u[name].value += (sky[key] - u[name].value) * ease;
      }
      if (motion && sky.storm && Math.random() < sky.storm * dt) flash = 0.6 + Math.random() * 0.4;
      flash *= Math.exp(-dt * 7);
      u.uFlash.value = flash > 0.02 ? flash * (0.6 + 0.4 * Math.sin(shared.uTime.value * 60)) : 0;
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function still() {
    // A paused scene settles every fade at once and draws one frame.
    cancelAnimationFrame(raf);
    raf = 0;
    for (let i = 0; i < 40; i++) step(0.05);
    renderer.render(scene, camera);
  }

  const onVisible = () => {
    if (!motion) return;
    cancelAnimationFrame(raf);
    raf = 0;
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVisible);
  // Observers run after the frame's animation callbacks, so draw again here or the cleared canvas would be shown once.
  const observer = new ResizeObserver(() => {
    if (!resize()) return;
    if (motion) renderer.render(scene, camera);
    else still();
  });
  observer.observe(canvas);

  return {
    setSeason(season, instant) {
      const next = SCENES[season];
      sky = next.sky;
      for (const l of layers) l.target = 0;
      for (const d of next.drifts) {
        const l = build(d);
        if (l) layers.push(l);
      }
      if (instant) {
        for (const l of layers) l.opacity = l.target;
        if (skyMat) {
          const u = skyMat.uniforms;
          (u.uTop.value as THREE.Color).set(sky.top);
          (u.uBottom.value as THREE.Color).set(sky.bottom);
          (u.uSunColor.value as THREE.Color).set(sky.sunColor);
          (u.uCloudColor.value as THREE.Color).set(sky.cloudColor);
          (u.uFogColor.value as THREE.Color).set(sky.fogColor);
          (u.uSun.value as THREE.Vector2).set(...sky.sun);
          Object.assign(u.uSunSize, { value: sky.sunSize });
          Object.assign(u.uSunStrength, { value: sky.sunStrength });
          Object.assign(u.uCloud, { value: sky.cloud });
          Object.assign(u.uCloudSpeed, { value: sky.cloudSpeed });
          Object.assign(u.uFog, { value: sky.fog });
        }
      }
      if (!motion) still();
    },
    setMotion(on) {
      motion = on;
      if (on) {
        last = performance.now();
        if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
      } else still();
    },
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      removeEventListener("pointermove", onMove);
      removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisible);
      layers.forEach(drop);
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
