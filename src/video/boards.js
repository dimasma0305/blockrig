// Drawn screens, boards and posters: on-screen text and pictures no asset carries (a laptop screen, a scoreboard, a
// banner, a poster, a cardboard standee). Drawn in code on a canvas; each panel's `set(key, p)` redraws only when
// what it shows changes, so the picture is a function of (key, p): frame-pure. Real brand and event names belong in
// plain text; real creator images (avatars, thumbnails) come from the caller (loadImages), never from the library.
// Every panel is marked userData.noCollide, so the staging check ignores it. BlockRig extra.
//
//   const tv = panel(3.4, 2.1, 1024, (g, W, H, key, p) => { fill(g, "#0b1020", W, H); text(g, key, W / 2, H / 2, H * 0.1, "#fff") })
//   tv.set("ACCESS GRANTED", p)
//   pic(g, images.avatar, x, y, w, h, { round: true })      // cover-fitted, a grey box when the image is missing
//   videoCard(g, { thumb, avatar, title: "Inside the Dark Web", channel: "John Hammond" }, x, y, w)
//   poster(img, 2, 3, { caption: "FAN CLUB" }); banner(["CTF FINALS", "2026"], 6, 1.5); standee(img, { height: 6.5 })
import * as THREE from "three";

export const BOARD_FONT = "Arial Black, Arial, sans-serif";

let makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
/** Replace how canvases are made (an OffscreenCanvas, or a stand-in for tests). */
export function setCanvasFactory(f) { makeCanvas = f; }
/** A canvas of this size from the current factory. */
export const createCanvas = (w, h) => makeCanvas(w, h);
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

/**
 * A flat panel `w` by `h` studs (a screen, a board) whose picture `draw(g, W, H, key, p)` is drawn on a canvas `px`
 * pixels wide whenever key or p (to 2 decimals) changes. Glowing (unlit, not tone mapped) unless `emissive: false`.
 */
export function panel(w, h, px, draw, { emissive = true } = {}) {
  const W = px, H = Math.round((px * h) / w), c = makeCanvas(W, H), g = c.getContext("2d"), t = tex(c);
  const mat = emissive ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  let last = null;
  mesh.set = (key = "", p = 0) => {
    const k = key + "|" + p.toFixed(2); if (k === last) return false; last = k;
    g.clearRect(0, 0, W, H); draw(g, W, H, key, p); t.needsUpdate = true; return true;
  };
  mesh.canvas = c; mesh.userData.noCollide = true;
  return mesh;
}

/** Fill the whole canvas. */
export const fill = (g, colour, W, H) => { g.fillStyle = colour; g.fillRect(0, 0, W, H); };
/** Bold centred text; shrinks to `maxW` pixels when given. */
export function text(g, s, x, y, size, colour, maxW, { align = "center", weight = 900, font = BOARD_FONT } = {}) {
  g.font = `${weight} ${size}px ${font}`; g.fillStyle = colour; g.textAlign = align; g.textBaseline = "middle";
  if (maxW) { const w = g.measureText(s)?.width ?? 0; if (w > maxW) g.font = `${weight} ${Math.floor((size * maxW) / w)}px ${font}`; }
  g.fillText(s, x, y);
}

/** Where an image of iw x ih goes to cover a w x h box at (x, y), centred (crop > 1 zooms out, < 1 zooms in). */
export function coverFit(iw, ih, x, y, w, h, crop = 1) {
  const k = Math.max(w / iw, h / ih) / crop, dw = iw * k, dh = ih * k;
  return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh };
}
/** A real image cover-fitted into a box, or a circle (`round`); a grey box when the image is missing. */
export function pic(g, img, x, y, w, h, { round = false, crop = 1, missing = "#555" } = {}) {
  g.save(); g.beginPath();
  if (round) g.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2); else g.rect(x, y, w, h);
  g.clip();
  if (img && img.width) { const f = coverFit(img.width, img.height, x, y, w, h, crop); g.drawImage(img, f.x, f.y, f.w, f.h); }
  else { g.fillStyle = missing; g.fillRect(x, y, w, h); }
  g.restore();
}
/** A YouTube-style video card at (x, y), `w` pixels wide: 16:9 thumbnail, duration chip, round avatar, title, channel. */
export function videoCard(g, { thumb, avatar, title, channel, duration = "12:34", dark = true, verified = true }, x, y, w) {
  const th = (w * 9) / 16; pic(g, thumb, x, y, w, th);
  g.fillStyle = "rgba(0,0,0,0.8)"; g.fillRect(x + w - w * 0.17, y + th - w * 0.09, w * 0.15, w * 0.07);
  text(g, duration, x + w - w * 0.095, y + th - w * 0.055, w * 0.045, "#fff", w * 0.14, { weight: 700, font: "Arial" });
  const a = w * 0.13; pic(g, avatar, x, y + th + w * 0.03, a, a, { round: true });
  text(g, title, x + a + w * 0.04, y + th + w * 0.075, w * 0.058, dark ? "#fff" : "#111", w - a - w * 0.05, { align: "left", weight: 800, font: "Arial" });
  text(g, channel + (verified ? " ✓" : ""), x + a + w * 0.04, y + th + w * 0.15, w * 0.05, dark ? "#aaa" : "#555", undefined, { align: "left", weight: 600, font: "Arial" });
  return th + w * 0.2;
}
/** A browser window: dark frame and a tab strip with these titles; returns the page area for drawing. */
export function browserWindow(g, W, H, tabs, active = 0) {
  fill(g, "#1b1f2a", W, H);
  const tw = Math.min(W / tabs.length, W * 0.4);
  tabs.forEach((t, i) => {
    g.fillStyle = i === active ? "#2f3647" : "#232838"; g.fillRect(i * tw + 4, 6, tw - 8, H * 0.11);
    text(g, t.length > 18 ? t.slice(0, 17) + "…" : t, i * tw + 16, 6 + H * 0.055, Math.round(H * 0.05), "#e8ecf5", undefined, { align: "left", weight: 700, font: "Arial" });
  });
  g.fillStyle = "#0e1118"; g.fillRect(0, H * 0.13, W, H * 0.87);
  return { x: 0, y: H * 0.13, w: W, h: H * 0.87 };
}

/** A banner or sign with plain-text lines: the first big, the rest in the accent colour. Lit (not glowing). */
export function banner(lines, w, h, { bg = "#14213d", fg = "#ffffff", accent = "#fca311", glow = false } = {}) {
  const m = panel(w, h, 1024, (g, W, H) => {
    fill(g, bg, W, H); g.fillStyle = accent; g.fillRect(0, H * 0.88, W, H * 0.12); g.fillRect(0, 0, W, H * 0.04);
    lines.forEach((l, i) => text(g, l, W / 2, H * (lines.length === 1 ? 0.46 : 0.3 + i * (0.5 / Math.max(1, lines.length - 1))), H * (i ? 0.13 : 0.24), i ? accent : fg, W * 0.88));
  }, { emissive: glow });
  m.set("x"); return m;
}
/** A poster or wallpaper: an image filling the panel, with an optional caption strip. */
export function poster(img, w, h, { caption = "", bg = "#6b2fb3", glow = false } = {}) {
  const m = panel(w, h, 1024, (g, W, H) => {
    fill(g, bg, W, H);
    const capH = caption ? H * 0.16 : 0; pic(g, img, W * 0.03, W * 0.03, W * 0.94, H - capH - W * 0.06);
    if (caption) text(g, caption, W / 2, H - capH / 2 - W * 0.01, capH * 0.62, "#fff", W * 0.9);
  }, { emissive: glow });
  m.set("x"); return m;
}

/**
 * A cardboard standee: a cut-out picture (`art`: an image with alpha, or a canvas you drew a figure on) with a white
 * cardboard border, standing on a foot, `height` studs tall, casting a shadow in its own shape. Feet on y = 0, faces +Z.
 */
export function standee(art, { height = 6.5, border = 9, board = "#f4f1ea", foot = "#b48a5a" } = {}) {
  const W = art.width, H = art.height, out = makeCanvas(W, H), o = out.getContext("2d");
  // dilate the shape by stamping it around a circle, paint that board-coloured, then draw the art on top
  for (let a = 0; a < 16; a++) o.drawImage(art, Math.cos((a / 16) * Math.PI * 2) * border, Math.sin((a / 16) * Math.PI * 2) * border);
  o.globalCompositeOperation = "source-in"; o.fillStyle = board; o.fillRect(0, 0, W, H); o.globalCompositeOperation = "source-over"; o.drawImage(art, 0, 0);
  const t = tex(out), w = height * (W / H), grp = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, height), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }));
  face.position.y = height / 2 + 0.05; face.castShadow = true; face.receiveShadow = true;
  face.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
  grp.add(face);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.1, 0.9), new THREE.MeshStandardMaterial({ color: foot, roughness: 0.9 }));
  base.position.set(0, 0.05, -0.3); base.castShadow = true; grp.add(base);
  grp.name = "standee";
  return grp;
}
