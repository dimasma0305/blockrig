// Procedural textures drawn on canvases, so every surface has detail without downloads: asphalt, sidewalk,
// grass, dirt, brick, siding, roof shingles, wood planks, plaster, tile, carpet, fabric, metal, glass, bark,
// leaves. Each returns a colour map (and a roughness/bump map where it matters) at a known real size in studs,
// so `material("brick", { size: [w, h] })` repeats it correctly on a face of that size.
// Swap any of them for a downloaded CC0 PBR set (see the materials skill) without changing the call sites.
import * as THREE from "three";
import { rng } from "./rng";

type Ctx = CanvasRenderingContext2D;
type Painter = (g: Ctx, n: number, r: () => number, o: TexOpts) => void;
export type TexOpts = { base?: string; accent?: string; seed?: number };
export type TexDef = { studs: number; roughness: number; metalness?: number; paint: Painter; bump?: boolean };

const shade = (hex: string, k: number) => { const c = new THREE.Color(hex); return "#" + (k >= 0 ? c.lerp(new THREE.Color("#ffffff"), k) : c.multiplyScalar(1 + k)).getHexString(); };
function speckle(g: Ctx, n: number, r: () => number, count: number, colours: string[], size = [1, 3]) {
  for (let i = 0; i < count; i++) { g.fillStyle = colours[Math.floor(r() * colours.length)]; const s = size[0] + r() * (size[1] - size[0]); g.fillRect(r() * n, r() * n, s, s); }
}
function noiseWash(g: Ctx, n: number, r: () => number, alpha = 0.08, blobs = 60) {
  for (let i = 0; i < blobs; i++) {
    const x = r() * n, y = r() * n, rad = n * (0.05 + r() * 0.2), grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.5; grd.addColorStop(0, dark ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.7})`); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

export const TEXTURES: Record<string, TexDef> = {
  asphalt: { studs: 16, roughness: 0.9, bump: true, paint: (g, n, r, o) => {
    g.fillStyle = o.base ?? "#3a3c40"; g.fillRect(0, 0, n, n); noiseWash(g, n, r, 0.12, 80);
    speckle(g, n, r, n * 14, ["#2a2b2e", "#4a4c52", "#55575c", "#232427"], [1, 2.5]);
    g.strokeStyle = "rgba(15,15,15,0.55)"; g.lineWidth = 1.5; // cracks
    for (let i = 0; i < 7; i++) { let x = r() * n, y = r() * n; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (r() - 0.5) * 30; y += (r() - 0.3) * 22; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = "rgba(20,20,20,0.35)"; for (let i = 0; i < 3; i++) g.fillRect(r() * n, r() * n, 30 + r() * 60, 20 + r() * 40); // patches
  } },
  sidewalk: { studs: 8, roughness: 0.85, bump: true, paint: (g, n, r, o) => {
    g.fillStyle = o.base ?? "#a9a6a0"; g.fillRect(0, 0, n, n); noiseWash(g, n, r, 0.08);
    speckle(g, n, r, n * 6, ["#9a978f", "#b8b5ae", "#8f8c86"]);
    g.strokeStyle = "rgba(60,58,55,0.7)"; g.lineWidth = 3; const s = n / 2; // 4-stud slabs
    for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, n); g.moveTo(0, k * s); g.lineTo(n, k * s); g.stroke(); }
  } },
  grass: { studs: 8, roughness: 0.95, paint: (g, n, r, o) => {
    const b = o.base ?? "#5d8f3a"; g.fillStyle = b; g.fillRect(0, 0, n, n); noiseWash(g, n, r, 0.12, 90);
    for (let i = 0; i < n * 22; i++) { g.strokeStyle = shade(b, (r() - 0.5) * 0.5); g.lineWidth = 1; const x = r() * n, y = r() * n; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5); g.stroke(); }
    speckle(g, n, r, 40, ["#f6f1a0", "#ffffff", "#e9a4c8"], [2, 3]); // a few flowers
  } },
  dirt: { studs: 8, roughness: 0.95, bump: true, paint: (g, n, r, o) => { g.fillStyle = o.base ?? "#7a5a3c"; g.fillRect(0, 0, n, n); noiseWash(g, n, r, 0.15, 100); speckle(g, n, r, n * 10, ["#6a4c31", "#8d6a48", "#5a3f28", "#9c8a72"], [1, 4]); } },
  brick: { studs: 6, roughness: 0.9, bump: true, paint: (g, n, r, o) => {
    g.fillStyle = "#cfc6b8"; g.fillRect(0, 0, n, n); const b = o.base ?? "#a4492f", rows = 12, h = n / rows, w = n / 6;
    for (let y = 0; y < rows; y++) for (let x = -1; x < 7; x++) { g.fillStyle = shade(b, (r() - 0.5) * 0.35); g.fillRect(x * w + (y % 2) * w / 2 + 2, y * h + 2, w - 4, h - 4); }
    noiseWash(g, n, r, 0.1);
  } },
  siding: { studs: 6, roughness: 0.75, bump: true, paint: (g, n, r, o) => {
    const b = o.base ?? "#d9d2c3", rows = 10, h = n / rows; g.fillStyle = b; g.fillRect(0, 0, n, n);
    for (let y = 0; y < rows; y++) { const grd = g.createLinearGradient(0, y * h, 0, (y + 1) * h); grd.addColorStop(0, shade(b, 0.08)); grd.addColorStop(0.85, shade(b, -0.06)); grd.addColorStop(1, shade(b, -0.25)); g.fillStyle = grd; g.fillRect(0, y * h, n, h); }
    noiseWash(g, n, r, 0.05);
  } },
  shingles: { studs: 6, roughness: 0.9, bump: true, paint: (g, n, r, o) => {
    const b = o.base ?? "#5b4a48", rows = 10, h = n / rows, w = n / 8; g.fillStyle = shade(b, -0.3); g.fillRect(0, 0, n, n);
    for (let y = 0; y < rows; y++) for (let x = -1; x < 9; x++) { g.fillStyle = shade(b, (r() - 0.5) * 0.3); g.fillRect(x * w + (y % 2) * w / 2 + 1, y * h + 1, w - 2, h - 3); }
  } },
  wood: { studs: 4, roughness: 0.7, paint: (g, n, r, o) => {
    const b = o.base ?? "#9a6b42", planks = 4, w = n / planks;
    for (let p = 0; p < planks; p++) { g.fillStyle = shade(b, (r() - 0.5) * 0.25); g.fillRect(p * w, 0, w, n);
      for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(60,35,15,${0.12 + r() * 0.18})`; g.lineWidth = 1 + r() * 1.5; const x = p * w + r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 8, n / 3, x + (r() - 0.5) * 8, n * 0.66, x, n); g.stroke(); }
      g.fillStyle = "rgba(40,22,10,0.6)"; g.fillRect(p * w, 0, 2, n); }
  } },
  plaster: { studs: 8, roughness: 0.92, paint: (g, n, r, o) => { g.fillStyle = o.base ?? "#e8e0d2"; g.fillRect(0, 0, n, n); noiseWash(g, n, r, 0.05, 70); speckle(g, n, r, n * 4, ["rgba(0,0,0,0.05)", "rgba(255,255,255,0.08)"], [1, 3]); } },
  tile: { studs: 4, roughness: 0.35, paint: (g, n, r, o) => {
    const b = o.base ?? "#e9ecef", c = o.accent ?? "#cdd3d8", k = 4, s = n / k;
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) { g.fillStyle = (x + y) % 2 && o.accent ? c : shade(b, (r() - 0.5) * 0.08); g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = "rgba(90,90,90,0.45)"; g.lineWidth = 3; for (let i = 0; i <= k; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, n); g.moveTo(0, i * s); g.lineTo(n, i * s); g.stroke(); }
  } },
  carpet: { studs: 6, roughness: 1, paint: (g, n, r, o) => { const b = o.base ?? "#6b5b8c"; g.fillStyle = b; g.fillRect(0, 0, n, n); speckle(g, n, r, n * 30, [shade(b, 0.12), shade(b, -0.15), shade(b, 0.05)], [1, 2]); noiseWash(g, n, r, 0.06); } },
  fabric: { studs: 3, roughness: 0.95, paint: (g, n, r, o) => {
    const b = o.base ?? "#4f7cc2", a = o.accent; g.fillStyle = b; g.fillRect(0, 0, n, n);
    if (a) { g.fillStyle = a; const s = n / 8; for (let i = 0; i < 8; i += 2) { g.globalAlpha = 0.55; g.fillRect(i * s, 0, s, n); g.fillRect(0, i * s, n, s); } g.globalAlpha = 1; } // plaid if an accent is given
    for (let y = 0; y < n; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; g.fillRect(0, y, n, 1); } // weave
    for (let x = 0; x < n; x += 2) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.fillRect(x, 0, 1, n); }
  } },
  metal: { studs: 4, roughness: 0.4, metalness: 0.8, paint: (g, n, r, o) => { const b = o.base ?? "#9aa1a8"; g.fillStyle = b; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(0, y, n, 1); } noiseWash(g, n, r, 0.06); } },
  bark: { studs: 3, roughness: 1, bump: true, paint: (g, n, r, o) => { const b = o.base ?? "#5a3f2a"; g.fillStyle = b; g.fillRect(0, 0, n, n); for (let i = 0; i < 40; i++) { g.strokeStyle = shade(b, -0.35 + r() * 0.2); g.lineWidth = 2 + r() * 3; const x = r() * n; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 12, n); g.stroke(); } } },
  leaves: { studs: 4, roughness: 0.9, paint: (g, n, r, o) => { const b = o.base ?? "#3f7a34"; g.fillStyle = b; g.fillRect(0, 0, n, n); for (let i = 0; i < n * 3; i++) { g.fillStyle = shade(b, (r() - 0.5) * 0.5); g.beginPath(); g.ellipse(r() * n, r() * n, 3 + r() * 4, 2 + r() * 2, r() * Math.PI, 0, Math.PI * 2); g.fill(); } } },
  lampshade: { studs: 2, roughness: 0.9, paint: (g, n, r, o) => { const b = o.base ?? "#f3e3c3"; const grd = g.createLinearGradient(0, 0, 0, n); grd.addColorStop(0, shade(b, -0.1)); grd.addColorStop(1, shade(b, 0.1)); g.fillStyle = grd; g.fillRect(0, 0, n, n); for (let x = 0; x < n; x += 6) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(x, 0, 2, n); } } },
};

const cache = new Map<string, THREE.Texture>();
function canvasTexture(key: string, paint: (g: Ctx, n: number) => void, n = 256, srgb = true) {
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement("canvas"); c.width = c.height = n; paint(c.getContext("2d")!, n);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t); return t;
}

/** The colour texture of a named surface (cached per name + options). */
export function texture(name: keyof typeof TEXTURES | string, o: TexOpts = {}, n = 256) {
  const def = TEXTURES[name]; if (!def) throw new Error(`unknown texture ${name}`);
  return canvasTexture(`${name}|${o.base}|${o.accent}|${o.seed}|${n}`, (g, s) => def.paint(g, s, rng(o.seed ?? 7), o), n);
}

/**
 * A ready material for a surface. `size` is the face size in studs ([u, v]) so the texture repeats at its real
 * scale; the material owns its repeat, so give each differently sized face its own material (they are cheap).
 */
export function material(name: keyof typeof TEXTURES | string, o: TexOpts & { size?: [number, number]; emissive?: string; emissiveIntensity?: number; side?: THREE.Side } = {}) {
  const def = TEXTURES[name]; if (!def) throw new Error(`unknown texture ${name}`);
  const map = texture(name, o).clone(); map.needsUpdate = true;
  const [u, v] = o.size ?? [def.studs, def.studs]; map.repeat.set(u / def.studs, v / def.studs);
  const m = new THREE.MeshStandardMaterial({ map, roughness: def.roughness, metalness: def.metalness ?? 0, side: o.side ?? THREE.FrontSide });
  if (def.bump) { m.bumpMap = map; m.bumpScale = 0.6; }
  if (o.emissive) { m.emissive.set(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; }
  return m;
}

/** Road markings painted over asphalt: centre dashes and edge lines, as a transparent overlay texture. */
export function roadMarkings({ dash = "#f2d14b", edge = "#e9e9e9" } = {}) {
  return canvasTexture(`road|${dash}|${edge}`, (g, n) => {
    g.clearRect(0, 0, n, n);
    g.fillStyle = edge; g.fillRect(n * 0.04, 0, n * 0.02, n); g.fillRect(n * 0.94, 0, n * 0.02, n);
    g.fillStyle = dash; for (let y = 0; y < n; y += n / 4) g.fillRect(n * 0.49, y, n * 0.02, n / 8);
    const r = rng(3); g.globalAlpha = 0.25; g.fillStyle = "#000"; for (let i = 0; i < 300; i++) g.fillRect(r() * n, r() * n, 2, 2); // worn paint (seeded: every render tab draws the same)
  });
}

/** A lit window: frame, panes and a warm (or dark) interior with a curtain, for houses and towers. */
export function windowTexture(lit: boolean, seed = 1, curtain = "#c95f5f") {
  return canvasTexture(`win|${lit}|${seed}|${curtain}`, (g, n) => {
    const r = rng(seed);
    g.fillStyle = "#f2f2f2"; g.fillRect(0, 0, n, n);
    const grd = g.createLinearGradient(0, 0, 0, n); grd.addColorStop(0, lit ? "#ffe2a8" : "#3b4a5e"); grd.addColorStop(1, lit ? "#f5b860" : "#1e2633");
    g.fillStyle = grd; g.fillRect(n * 0.08, n * 0.08, n * 0.84, n * 0.84);
    g.fillStyle = curtain; g.globalAlpha = 0.85; g.fillRect(n * 0.08, n * 0.08, n * (0.12 + r() * 0.12), n * 0.84); g.fillRect(n * (0.68 + r() * 0.1), n * 0.08, n * 0.24, n * 0.84); g.globalAlpha = 1;
    g.fillStyle = "#f2f2f2"; g.fillRect(n * 0.48, 0, n * 0.04, n); g.fillRect(0, n * 0.48, n, n * 0.04);
    if (!lit) { g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(n * 0.15, n * 0.85); g.lineTo(n * 0.4, n * 0.12); g.lineTo(n * 0.5, n * 0.12); g.lineTo(n * 0.25, n * 0.85); g.fill(); }
  }, 128);
}
