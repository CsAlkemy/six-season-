/**
 * Each season's sky (gradient, sun, clouds, fog) and the shader that paints it, with no three.js: the animated scene
 * (lib/season-scene.ts) draws it moving, and paintSky draws it once, still, while the page animation is off. Both
 * run the same shader with the same numbers, so switching the animation on or off keeps the same sky.
 */
import type { Season } from "./types";

export interface Sky {
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

export const SKIES: Record<Season, Sky> = {
  // Grishma: a white-hot sun, haze, and kalboishakhi gusts throwing krishnachura petals and dust across the page.
  grishma: { top: "#f9d8a6", bottom: "#fff6e6", sun: [0.84, 0.1], sunColor: "#ffb04a", sunSize: 0.38, sunStrength: 1, cloud: 0.12, cloudColor: "#fff3dc", cloudSpeed: 0.02, fog: 0.18, fogColor: "#ffe9c4", storm: 0 },
  // Barsha: a low, moving overcast, slanting rain at every depth, and now and then lightning.
  barsha: { top: "#8fa1b2", bottom: "#dfe6ec", sun: [0.5, -0.4], sunColor: "#dfe8f0", sunSize: 0.3, sunStrength: 0, cloud: 0.8, cloudColor: "#6f7f8e", cloudSpeed: 0.06, fog: 0.35, fogColor: "#e6edf2", storm: 0.06 },
  // Sharat: the clearest blue of the year, white clouds sailing, kash fluff floating up.
  sharat: { top: "#7fbbe8", bottom: "#f1f8fd", sun: [0.14, 0.08], sunColor: "#fff6d8", sunSize: 0.28, sunStrength: 0.7, cloud: 0.55, cloudColor: "#ffffff", cloudSpeed: 0.015, fog: 0.08, fogColor: "#ffffff", storm: 0 },
  // Hemanta: low golden light after the harvest, a little haze, dry leaves and paddy chaff coming down.
  hemanta: { top: "#efc27a", bottom: "#fbf0da", sun: [0.76, 0.28], sunColor: "#ff9f3d", sunSize: 0.42, sunStrength: 0.85, cloud: 0.22, cloudColor: "#ffe2b0", cloudSpeed: 0.01, fog: 0.3, fogColor: "#fbe6c0", storm: 0 },
  // Sheet: a pale sun behind thick morning fog rolling over the fields, dew in the air, mustard petals.
  sheet: { top: "#d4dce3", bottom: "#f6f7f6", sun: [0.5, 0.16], sunColor: "#fff1d0", sunSize: 0.3, sunStrength: 0.45, cloud: 0.15, cloudColor: "#ffffff", cloudSpeed: 0.008, fog: 0.85, fogColor: "#ffffff", storm: 0 },
  // Basanta: a pink-gold morning, shimul and palash petals falling, pollen in the light.
  basanta: { top: "#f9cfc4", bottom: "#fbf8ee", sun: [0.2, 0.14], sunColor: "#ffd27a", sunSize: 0.34, sunStrength: 0.75, cloud: 0.25, cloudColor: "#fff1ea", cloudSpeed: 0.012, fog: 0.12, fogColor: "#fff4ec", storm: 0 },
};

export const SKY_FRAG = /* glsl */ `
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

const VERT = "attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
${SKY_FRAG}`;

/** "#f9d8a6" as 0–1 channels, in sRGB like the shader works (three.js's colour management is off for the same reason). */
const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export interface StillSky {
  setSeason(season: Season): void;
  dispose(): void;
}

/**
 * The season's sky painted once on `canvas`: the same shader as the animated scene at its first moment, drawn again
 * only when the season or the canvas size changes. No three.js and no animation frames, so with the page animation
 * off the sun, clouds and fog are there for the cost of one draw. Null without WebGL: the CSS gradient stays the sky.
 */
export function paintSky(canvas: HTMLCanvasElement, season: Season): StillSky | null {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return null;
  let program: WebGLProgram | null = null;

  /** Compiles the shader and the screen-covering triangle; again after a lost context comes back. */
  function setup() {
    const shader = (type: number, source: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, source);
      gl!.compileShader(s);
      return s;
    };
    const p = gl!.createProgram()!;
    gl!.attachShader(p, shader(gl!.VERTEX_SHADER, VERT));
    gl!.attachShader(p, shader(gl!.FRAGMENT_SHADER, FRAG));
    gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) return false;
    gl!.useProgram(p);
    // One triangle bigger than the screen covers every pixel.
    gl!.bindBuffer(gl!.ARRAY_BUFFER, gl!.createBuffer());
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl!.STATIC_DRAW);
    const aPos = gl!.getAttribLocation(p, "aPos");
    gl!.enableVertexAttribArray(aPos);
    gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
    program = p;
    return true;
  }
  if (!setup()) return null;
  const at = (name: string) => gl!.getUniformLocation(program!, name);

  let sky = SKIES[season];
  let size = "";
  function draw() {
    if (!program || gl!.isContextLost()) return;
    // The same box and pixel ratio rules as the animated scene, so the two line up when one fades into the other.
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    size = `${w}x${h}@${dpr}`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.uniform3fv(at("uTop"), rgb(sky.top));
    gl!.uniform3fv(at("uBottom"), rgb(sky.bottom));
    gl!.uniform3fv(at("uSunColor"), rgb(sky.sunColor));
    gl!.uniform3fv(at("uCloudColor"), rgb(sky.cloudColor));
    gl!.uniform3fv(at("uFogColor"), rgb(sky.fogColor));
    gl!.uniform2f(at("uSun"), sky.sun[0], sky.sun[1]);
    gl!.uniform2f(at("uRes"), w, h);
    gl!.uniform1f(at("uTime"), 0);
    gl!.uniform1f(at("uSunSize"), sky.sunSize);
    gl!.uniform1f(at("uSunStrength"), sky.sunStrength);
    gl!.uniform1f(at("uCloud"), sky.cloud);
    gl!.uniform1f(at("uCloudSpeed"), sky.cloudSpeed);
    gl!.uniform1f(at("uFog"), sky.fog);
    gl!.uniform1f(at("uFlash"), 0);
    gl!.uniform1f(at("uScroll"), 0);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }
  draw();

  // Only a real change of the box (100% × 100lvh) repaints; a phone's toolbars sliding mid-scroll don't change it.
  const observer = new ResizeObserver(() => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (size !== `${canvas.clientWidth || innerWidth}x${canvas.clientHeight || innerHeight}@${dpr}`) draw();
  });
  observer.observe(canvas);
  // A lost context (the GPU reset, the tab went to sleep) comes back blank and empty: build and paint it again.
  const onRestored = () => setup() && draw();
  canvas.addEventListener("webglcontextrestored", onRestored);
  const onLost = (e: Event) => {
    e.preventDefault();
    program = null;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    setSeason(next) {
      sky = SKIES[next];
      draw();
    },
    dispose() {
      observer.disconnect();
      canvas.removeEventListener("webglcontextrestored", onRestored);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
