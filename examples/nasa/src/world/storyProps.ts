// Small story props no downloaded kit has (the red ball, juice boxes, the yogurt, milk bottles, the certificate,
// workbooks, trophies, suitcases, badges, a phone, a sandwich, the tiny sunscreen, the receipt, the party hat, the
// dragon plush). Built from a few boxes and cylinders with a toon outline (the reason: no CC0 or Roblox asset fits,
// docs/visuals.md). Things held in a hand are modelled handle +Y up, front -Z (look skill, equipTool).
import * as THREE from "three";
import { outlined } from "../cast/props";
import { banner } from "./boards";

const std = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...o });
export const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, outline = 0.02) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (outline) outlined(o, outline); return o;
};
const grp = (...o: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...o); return g; };
/** A flat label on a face (front = +Z by default). */
const label = (lines: string[], w: number, h: number, bg: string, fg: string, accent: string) => { const b = banner(lines, w, h, bg, fg, accent); return b; };

export function redBall(r = 0.55) { return mesh(new THREE.SphereGeometry(r, 24, 16), std("#e0242c", { roughness: 0.35 }), 0, r, 0); }
export function juiceBox() {
  const g = grp(mesh(new THREE.BoxGeometry(0.5, 0.75, 0.32), std("#ff9f1c"), 0, 0.375, 0), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), std("#ffffff"), 0.12, 0.88, 0, 0));
  const l = label(["JUICE"], 0.42, 0.3, "#ff9f1c", "#ffffff", "#2ec4b6"); l.position.set(0, 0.38, 0.165); g.add(l); return g;
}
export function yogurt(open = 0) {
  const g = grp(mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.5, 16), std("#f6f1e7"), 0, 0.25, 0));
  const lid = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), std("#5aa9e6", { metalness: 0.6, roughness: 0.3 }), 0, 0.52, 0, 0);
  lid.name = "lid"; lid.userData.open = open; g.add(lid); return g;
}
export function milkBottle() { return grp(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 14), std("#fbfbfb", { roughness: 0.3 }), 0, 0.35, 0), mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.25, 12), std("#ffb3c6"), 0, 0.82, 0)); }
export function book(title: string, colour: string, w = 1.6, h = 2.1) {
  const g = grp(mesh(new THREE.BoxGeometry(w, 0.25, h), std(colour), 0, 0.125, 0));
  const l = label([title], w * 0.85, h * 0.5, colour, "#ffffff", "#ffffff"); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.26, 0); g.add(l); return g;
}
export function sheet(w: number, h: number) { return mesh(new THREE.BoxGeometry(w, h, 0.04), std("#ffffff"), 0, 0, 0, 0); }
export function trophy(h = 2.4) {
  const gold = std("#e8b923", { metalness: 0.85, roughness: 0.25 });
  return grp(mesh(new THREE.BoxGeometry(h * 0.45, h * 0.15, h * 0.45), std("#3b2a1a"), 0, h * 0.075, 0), mesh(new THREE.CylinderGeometry(h * 0.06, h * 0.1, h * 0.35, 10), gold, 0, h * 0.32, 0),
    mesh(new THREE.CylinderGeometry(h * 0.3, h * 0.12, h * 0.45, 16), gold, 0, h * 0.72, 0), mesh(new THREE.TorusGeometry(h * 0.13, h * 0.03, 8, 16), gold, h * 0.3, h * 0.75, 0));
}
/** A small rolling suitcase; `open` lays the lid back (top-down shots look into it). Stickers are plain text. */
export function suitcase(colour = "#2f6fd6", open = false, stickers: string[] = []) {
  const g = new THREE.Group(), w = 3.2, d = 2.2, h = open ? 0.9 : 2.6;
  g.add(mesh(new THREE.BoxGeometry(w, h, d), std(colour), 0, h / 2 + 0.2, 0));
  if (open) {
    g.add(mesh(new THREE.BoxGeometry(w * 0.92, 0.1, d * 0.88), std("#2b2b33"), 0, h + 0.16, 0, 0)); // the lining
    const lid = mesh(new THREE.BoxGeometry(w, 0.6, d), std(colour), 0, h + 0.3 + d / 2, -d / 2 - 0.25); lid.rotation.x = Math.PI / 2; g.add(lid);
    stickers.forEach((s, i) => { const l = label([s], 1.3, 0.55, ["#111", "#c1121f", "#023e8a"][i % 3], "#fff", "#ffd166"); l.position.set(-0.7 + i * 1.4 - (stickers.length > 2 ? 0.4 : 0), h + 0.3 + d / 2 + (i % 2) * 0.5 - 0.3, -d / 2 - 0.56); l.rotation.x = 0; g.add(l); });
  } else {
    g.add(mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), std("#222"), -0.6, h + 0.8, 0), mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), std("#222"), 0.6, h + 0.8, 0), mesh(new THREE.BoxGeometry(1.32, 0.14, 0.14), std("#222"), 0, h + 1.4, 0));
    for (const x of [-1.3, 1.3]) g.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 10), std("#111"), x, 0.18, d / 2 - 0.3, 0));
    stickers.forEach((s, i) => { const l = label([s], 1.3, 0.55, ["#111", "#c1121f", "#023e8a"][i % 3], "#fff", "#ffd166"); l.position.set(-0.75 + (i % 2) * 1.5, 1.2 + Math.floor(i / 2) * 0.7, d / 2 + 0.01); g.add(l); });
  }
  return g;
}
/** A conference badge on a lanyard (worn on the chest: BodyFrontAttachment-ish, placed by hand). */
export function badge(text: string, colour = "#e63946") {
  const g = new THREE.Group(), l = label([text], 0.75, 0.5, colour, "#fff", "#ffd166"); g.add(l);
  return g;
}
export function phone() { const g = grp(mesh(new THREE.BoxGeometry(0.5, 0.95, 0.08), std("#15151a", { roughness: 0.3 }), 0, 0, 0, 0.015)); return g; }
export function sandwich() {
  return grp(mesh(new THREE.BoxGeometry(0.9, 0.16, 0.7), std("#e9c58a"), 0, 0, 0), mesh(new THREE.BoxGeometry(0.95, 0.07, 0.75), std("#5fbf4a"), 0, 0.1, 0, 0), mesh(new THREE.BoxGeometry(0.92, 0.08, 0.72), std("#d94f4f"), 0, 0.17, 0, 0), mesh(new THREE.BoxGeometry(0.9, 0.16, 0.7), std("#e9c58a"), 0, 0.29, 0));
}
/** The tiny bottle of sunscreen (the $5,000 investment). */
export function sunscreen() {
  const g = grp(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.55, 14), std("#ffd23f"), 0, 0.275, 0), mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10), std("#ff6b35"), 0, 0.63, 0));
  const l = label(["SPF 50"], 0.3, 0.18, "#ffd23f", "#ff6b35", "#ff6b35"); l.position.set(0, 0.28, 0.17); g.add(l); return g;
}
/** The birthday party hat (a striped cone with a pompom), worn on HatAttachment. */
export function partyHat() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ff4fa3" : "#3ec6ff"; g.fillRect(0, i * 32, 256, 32); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "#ffe066"; g.beginPath(); g.arc((i * 61) % 256, (i * 37) % 256, 6, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return grp(mesh(new THREE.ConeGeometry(0.55, 1.4, 20), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), 0, 0.7, 0), mesh(new THREE.SphereGeometry(0.2, 12, 8), std("#ffe066"), 0, 1.45, 0));
}
/** The dinosaur (dragon) plush: a soft green blocky dragon with little wings. */
export function dragonPlush(s = 1) {
  const green = std("#4caf50", { roughness: 0.95 }), belly = std("#c5e1a5", { roughness: 0.95 }), dark = std("#1b5e20", { roughness: 0.9 });
  const g = grp(
    mesh(new THREE.BoxGeometry(1.1 * s, 1.0 * s, 1.4 * s), green, 0, 0.6 * s, 0, 0.03), mesh(new THREE.BoxGeometry(0.8 * s, 0.7 * s, 0.1 * s), belly, 0, 0.55 * s, 0.71 * s, 0),
    mesh(new THREE.BoxGeometry(0.9 * s, 0.8 * s, 0.9 * s), green, 0, 1.45 * s, 0.35 * s, 0.03), mesh(new THREE.BoxGeometry(0.6 * s, 0.35 * s, 0.4 * s), green, 0, 1.3 * s, 0.95 * s, 0.03),
    mesh(new THREE.BoxGeometry(0.12 * s, 0.12 * s, 0.05 * s), std("#111"), -0.22 * s, 1.6 * s, 0.81 * s, 0), mesh(new THREE.BoxGeometry(0.12 * s, 0.12 * s, 0.05 * s), std("#111"), 0.22 * s, 1.6 * s, 0.81 * s, 0),
    mesh(new THREE.BoxGeometry(0.35 * s, 0.35 * s, 1.0 * s), green, 0, 0.35 * s, -1.0 * s, 0.03),
  );
  for (const x of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.7 * s, 0.6 * s, 0.08 * s), dark, x * 0.75 * s, 1.0 * s, -0.2 * s); w.rotation.y = x * 0.5; g.add(w); }
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.ConeGeometry(0.12 * s, 0.3 * s, 4), dark, 0, (1.9 - i * 0.35) * s, (0.2 - i * 0.4) * s, 0));
  return g;
}
/** The big sealed package (OPEN AFTER NASA), a Kenney cardboard box with a label on the front. */
export function packageLabel() { return banner(["OPEN AFTER", "NASA"], 3.0, 1.6, "#fff3cf", "#c1121f", "#c1121f"); }
export function stickyNote(text = "TRY HARDER") { return banner([text], 0.9, 0.9, "#ffe94d", "#222222", "#e0c200"); }

/** The Wi-Fi router Mom changes the password on: a box with two antennas and blinking lights. */
export function router() {
  const g = grp(mesh(new THREE.BoxGeometry(1.4, 0.32, 0.9), std("#f2f2f2", { roughness: 0.4 }), 0, 0.16, 0));
  for (const x of [-0.5, 0.5]) { const a = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 8), std("#222"), x, 0.75, -0.35); a.rotation.z = x * 0.3; g.add(a); }
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: i % 2 ? "#3dff8b" : "#7ad7ff", toneMapped: false }), -0.4 + i * 0.25, 0.2, 0.46, 0));
  return g;
}
