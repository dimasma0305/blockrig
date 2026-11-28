// Hair, headwear, glasses, laptops and floating rank tags: original blocky props built from boxes, with vertex
// colour gradients (dark roots to lighter tips, plus highlight streaks) and a toon outline that matches the rig's.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../kit/rng";

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const AT = (pos: number[]) => ({ rot: I3, pos });

// ---- building blocks ----
type Piece = { g: THREE.BufferGeometry; tip?: THREE.Color; root?: THREE.Color };
function box(w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  return g;
}
function cone(r: number, h: number, x: number, y: number, z: number, rx = 0, rz = 0, sides = 4) {
  const g = new THREE.ConeGeometry(r, h, sides).toNonIndexed(); g.rotateY(Math.PI / 4);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1)));
  return g;
}
// colour every vertex by height: roots (low) darker, tips (high / far from the head) lighter
function paint(pieces: Piece[], root: THREE.Color, tip: THREE.Color) {
  for (const p of pieces) {
    const g = p.g, pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    g.computeBoundingBox(); const lo = g.boundingBox!.min.y, hi = g.boundingBox!.max.y;
    const a = p.root || root, b = p.tip || tip, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const k = hi > lo ? (pos.getY(i) - lo) / (hi - lo) : 1; c.copy(a).lerp(b, Math.min(1, k * 0.9 + 0.1)); c.toArray(col, i * 3); }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  const m = mergeGeometries(pieces.map((p) => { const g = p.g; if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }));
  m.computeVertexNormals();
  return m;
}
// the rig's toon outline, for props: back faces pushed out along the normals
export function outlined(mesh: THREE.Mesh, width = 0.03) {
  const m = new THREE.MeshBasicMaterial({ color: 0x0b0708, side: THREE.BackSide });
  m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", `vec3 transformed = position + normal * ${width.toFixed(3)};`); };
  m.customProgramCacheKey = () => `prop-outline-${width}`;
  const ol = new THREE.Mesh(mesh.geometry, m); ol.name = "outline"; mesh.add(ol);
  mesh.castShadow = true;
  return mesh;
}
const hairMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });

// ---- hair: origin at the top centre of the head (HairAttachment); the head is 1.2 tall, ~1.24 across,
// its front is -Z and the eyes sit ~0.55 below the top, so fringes stop above -0.34 ----
export type HairStyle = "messy" | "swept" | "spiky" | "slick" | "pigtails" | "bun" | "afro" | "buzz";
export function hair(style: HairStyle, colour: string, opts: { streak?: string; seed?: number; tie?: string } = {}) {
  const r = rng(opts.seed ?? 1), base = new THREE.Color(colour), root = base.clone().multiplyScalar(0.55), tip = base.clone().lerp(new THREE.Color("#ffffff"), 0.18);
  const P: Piece[] = [];
  const cap = (h = 0.3) => { P.push({ g: box(1.36, h, 1.36, 0, -h / 2 + 0.12, 0.02) }); P.push({ g: box(1.38, 0.74, 0.22, 0, -0.42, 0.62) }); for (const s of [-1, 1]) P.push({ g: box(0.2, 0.5, 1.2, s * 0.66, -0.3, 0.08) }); };
  if (style === "messy" || style === "swept") {
    cap();
    const n = style === "messy" ? 9 : 5;
    for (let i = 0; i < n; i++) { const x = -0.5 + (i / (n - 1)) * 1.0, z = -0.25 + r() * 0.6; P.push({ g: box(0.34, 0.42 + r() * 0.2, 0.34, x, 0.26 + r() * 0.08, z, (r() - 0.5) * 0.7, r() * 1.2, (r() - 0.5) * 0.8) }); }
    // fringe: chunky locks swept to one side, ending above the eyes
    for (let i = 0; i < 4; i++) P.push({ g: box(0.36, 0.34, 0.24, -0.45 + i * 0.3, -0.16 - (i % 2) * 0.05, -0.62, 0.15, 0, style === "swept" ? -0.45 : (r() - 0.5) * 0.6) });
    if (opts.streak) { const s = new THREE.Color(opts.streak); P.push({ g: box(0.3, 0.36, 0.26, -0.48, -0.15, -0.66, 0.15, 0, 0.25), root: s.clone().multiplyScalar(0.7), tip: s }); P.push({ g: box(0.26, 0.5, 0.3, -0.42, 0.3, -0.35, -0.3, 0, 0.3), root: s.clone().multiplyScalar(0.7), tip: s }); }
  } else if (style === "spiky") {
    cap(0.24);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, rr = 0.3 + (i % 2) * 0.18; P.push({ g: cone(0.2, 0.75 + r() * 0.3, Math.sin(a) * rr, 0.38, Math.cos(a) * rr, Math.cos(a) * 0.65, -Math.sin(a) * 0.65) }); }
    P.push({ g: cone(0.22, 0.6, 0, 0.42, -0.5, -1.1, 0) });
  } else if (style === "slick") {
    P.push({ g: box(1.34, 0.26, 1.34, 0, 0.0, 0.04) }); P.push({ g: box(1.2, 0.34, 1.0, 0, 0.18, 0.18, -0.25) }); P.push({ g: box(1.36, 0.5, 0.18, 0, -0.32, 0.64) });
    for (const s of [-1, 1]) P.push({ g: box(0.1, 0.34, 1.0, s * 0.64, -0.3, 0.12) });
  } else if (style === "pigtails") {
    cap();
    for (let i = 0; i < 5; i++) P.push({ g: box(0.3, 0.26, 0.22, -0.56 + i * 0.28, -0.2, -0.63) });
    for (const s of [-1, 1]) { P.push({ g: box(0.34, 0.7, 0.34, s * 0.86, -0.55, 0.15, 0, 0, s * 0.18) }); P.push({ g: box(0.24, 0.12, 0.38, s * 0.8, -0.24, 0.15), root: new THREE.Color(opts.tie ?? "#ff4d8d"), tip: new THREE.Color(opts.tie ?? "#ff4d8d") }); }
  } else if (style === "bun") {
    cap(0.26); P.push({ g: box(0.56, 0.42, 0.56, 0, 0.3, 0.25, 0.2, 0.6, 0) }); P.push({ g: box(1.3, 0.22, 0.22, 0, -0.12, -0.6) });
  } else if (style === "afro") {
    const g = new THREE.IcosahedronGeometry(0.95, 1).toNonIndexed(); g.scale(1.05, 0.78, 1.0); g.translate(0, 0.02, 0.1); P.push({ g });
  } else if (style === "buzz") {
    P.push({ g: box(1.3, 0.14, 1.3, 0, 0.0, 0.02) }); for (const s of [-1, 1]) P.push({ g: box(0.06, 0.3, 1.0, s * 0.64, -0.2, 0.1) });
  }
  return outlined(new THREE.Mesh(paint(P, root, tip), hairMat()));
}

// ---- headwear and face props (HatAttachment = top of the head; FaceFrontAttachment = front, eye height) ----
export function baseballCap(colour: string, brim = "#1d1d1d") {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8 });
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.34, 16, 1, false, 0, Math.PI * 2), m); dome.position.y = 0.06; g.add(outlined(dome));
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.55), new THREE.MeshStandardMaterial({ color: brim, roughness: 0.7 })); lip.position.set(0, -0.08, -0.85); g.add(outlined(lip));
  const btn = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m); btn.position.y = 0.25; g.add(btn);
  return g;
}
export function chefHat() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: "#fbfbf8", roughness: 0.9 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.66, 0.36, 18), m); band.position.y = 0.08; g.add(outlined(band));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, puff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), m); puff.position.set(Math.sin(a) * 0.32, 0.55, Math.cos(a) * 0.32); g.add(outlined(puff)); }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), m); top.position.y = 0.72; g.add(outlined(top));
  return g;
}
export function headphones(colour: string, glow: string) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: "#1b1b22", roughness: 0.4, metalness: 0.3 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 8, 24, Math.PI), m); arc.position.y = -0.55; g.add(outlined(arc));
  for (const s of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5 })); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.74, -0.6, 0); g.add(outlined(cup));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 20), new THREE.MeshBasicMaterial({ color: glow })); ring.rotation.y = Math.PI / 2; ring.position.set(s * 0.85, -0.6, 0); g.add(ring);
  }
  return g;
}
export function visor(glow: string) {
  const g = new THREE.Group();
  const lens = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.24, 0.08), new THREE.MeshPhysicalMaterial({ color: glow, emissive: new THREE.Color(glow), emissiveIntensity: 1.4, transparent: true, opacity: 0.85, roughness: 0.1 }));
  lens.position.z = -0.06; g.add(outlined(lens, 0.02));
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.7), new THREE.MeshStandardMaterial({ color: "#111" })); arm.position.set(s * 0.62, 0, 0.3); g.add(arm); }
  return g;
}
export function glasses(colour = "#111111") {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.3, metalness: 0.4 });
  for (const s of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 4), m); rim.rotation.z = Math.PI / 4; rim.position.set(s * 0.26, 0, -0.08); g.add(rim); }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), m); bridge.position.z = -0.08; g.add(bridge);
  return g;
}

// ---- laptop: modelled lying flat, hinge at -Z; the screen shows a canvas ----
export function laptop(screenText: string[], accent = "#00e5ff", lidColour = "#2a2d34") {
  const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: lidColour, roughness: 0.35, metalness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.8), body); g.add(outlined(base, 0.02));
  const lid = new THREE.Group(); lid.position.set(0, 0.03, 0.4); lid.rotation.x = -1.9; g.add(lid);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.8), body); shell.position.z = -0.4; lid.add(outlined(shell, 0.02));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.72), new THREE.MeshBasicMaterial({ map: codeTexture(screenText, accent), toneMapped: false }));
  screen.rotation.x = Math.PI / 2; screen.position.set(0, -0.03, -0.4); lid.add(screen);
  const sticker = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: accent })); sticker.rotation.x = -Math.PI / 2; sticker.position.set(0.25, 0.03, -0.45); lid.add(sticker);
  g.userData.lid = lid;
  return g;
}
export function codeTexture(lines: string[], accent = "#00e5ff", w = 512, h = 336) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!;
  g.fillStyle = "#05080f"; g.fillRect(0, 0, w, h);
  g.font = "bold 22px Consolas, monospace";
  lines.forEach((l, i) => { g.fillStyle = l.startsWith("$") ? accent : l.includes("flag{") ? "#39ff88" : i % 3 === 0 ? "#ff4d8d" : "#c9d1d9"; g.fillText(l, 16, 34 + i * 28); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---- floating rank tag (a sprite over the head that always faces the camera) ----
export function rankTag(text: string, colour = "#00e5ff") {
  const c = document.createElement("canvas"); c.width = 512; c.height = 144; const g = c.getContext("2d")!;
  const draw = (s: string, col: string) => {
    g.clearRect(0, 0, 512, 144);
    g.fillStyle = "rgba(6,10,20,0.85)"; g.strokeStyle = col; g.lineWidth = 8; roundRect(g, 8, 8, 496, 128, 28); g.fill(); g.stroke();
    g.font = "800 66px Consolas, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 18; g.fillText(s, 256, 76); g.shadowBlur = 0;
  };
  draw(text, colour);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(1.9, 0.54, 1);
  sprite.userData.set = (s: string, col = colour) => { if (sprite.userData.last === s + col) return; sprite.userData.last = s + col; draw(s, col); tex.needsUpdate = true; };
  sprite.userData.last = text + colour;
  return sprite;
}
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
