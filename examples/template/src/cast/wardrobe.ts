// Original clothing, drawn in code on Roblox's classic 585x559 Shirt/Pants template (BlockRig composites them
// onto the body like Roblox does). Every face gets light-to-dark shading and a fabric grain so nothing reads flat.
import { TEMPLATE, TEMPLATE_SIZE } from "blockrig";
import { rng } from "blockrig/video";

type Rect = [number, number, number, number];
type Faces = Record<"U" | "D" | "F" | "B" | "L" | "R", Rect>;
const [TW, TH] = TEMPLATE_SIZE as [number, number];
const T = TEMPLATE as unknown as Record<"Torso" | "RightLimb" | "LeftLimb", Faces>;
const SIDES = ["F", "B", "L", "R"] as const;
const LIMBS = [T.RightLimb, T.LeftLimb];

function sheet(paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas"); c.width = TW; c.height = TH;
  const g = c.getContext("2d")!; paint(g); return c;
}
// fill part of a face (from..to of its height) with a colour, shaded top-light to bottom-dark, with grain
function cloth(g: CanvasRenderingContext2D, [x, y, w, h]: Rect, colour: string, from = 0, to = 1, seed = 1) {
  const y0 = y + h * from, hh = h * (to - from);
  g.fillStyle = colour; g.fillRect(x, y0, w, hh);
  const grad = g.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, "rgba(255,255,255,0.10)"); grad.addColorStop(0.5, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,0.22)");
  g.fillStyle = grad; g.fillRect(x, y0, w, hh);
  const r = rng(seed + x * 7 + y);
  for (let i = 0; i < (w * hh) / 18; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(x + r() * w, y0 + r() * hh, 1.2, 1.2); }
}
const band = (g: CanvasRenderingContext2D, [x, y, w, h]: Rect, colour: string, from: number, to: number, ribs = false) => {
  g.fillStyle = colour; g.fillRect(x, y + h * from, w, h * (to - from));
  if (ribs) { g.fillStyle = "rgba(0,0,0,0.18)"; for (let i = x + 2; i < x + w; i += 4) g.fillRect(i, y + h * from, 1.4, h * (to - from)); }
};
const seam = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colour = "rgba(0,0,0,0.35)", width = 1.5, dash = [4, 3]) => {
  g.save(); g.strokeStyle = colour; g.lineWidth = width; g.setLineDash(dash); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
};
const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, colour: string, font = "800 SIZEpx 'Consolas', monospace") => {
  g.save(); g.font = font.replace("SIZE", String(size)); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = colour; g.fillText(s, x, y); g.restore();
};

// ---- shirts ----
export function hoodie(base: string, accent: string, logo = "{ }", seed = 1, back = "") {
  return sheet((g) => {
    for (const f of Object.values(T.Torso)) cloth(g, f, base, 0, 1, seed);
    for (const L of LIMBS) { for (const s of SIDES) { cloth(g, L[s], base, 0, 0.8, seed + 3); band(g, L[s], shade(base, -0.25), 0.73, 0.8, true); } cloth(g, L.U, base); }
    const [fx, fy, fw, fh] = T.Torso.F;
    band(g, T.Torso.F, shade(base, -0.25), 0.9, 1, true);
    // kangaroo pocket and drawstrings
    g.fillStyle = shade(base, -0.12); g.beginPath(); g.moveTo(fx + 22, fy + fh * 0.88); g.lineTo(fx + 32, fy + fh * 0.62); g.lineTo(fx + fw - 32, fy + fh * 0.62); g.lineTo(fx + fw - 22, fy + fh * 0.88); g.closePath(); g.fill();
    seam(g, fx + 32, fy + fh * 0.62, fx + fw - 32, fy + fh * 0.62);
    g.strokeStyle = "#f1f1f1"; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(fx + fw / 2 + s * 12, fy + 4); g.lineTo(fx + fw / 2 + s * 14, fy + 40); g.stroke(); g.fillStyle = "#cfcfcf"; g.fillRect(fx + fw / 2 + s * 14 - 2, fy + 40, 4, 7); }
    // hood round the neck, on the top and the back
    band(g, T.Torso.F, shade(base, -0.18), 0, 0.06); band(g, T.Torso.B, shade(base, -0.18), 0, 0.22); cloth(g, T.Torso.U, shade(base, -0.1));
    text(g, logo, fx + fw / 2, fy + 52, 30, accent);
    if (back) { const [bx, by, bw] = T.Torso.B; text(g, back, bx + bw / 2, by + 70, 26, accent); }
    seam(g, fx, fy + 8, fx + fw, fy + 8);
  });
}
export function teamJacket(base: string, accent: string, num: string, team = "0xDEAD", seed = 2) {
  return sheet((g) => {
    for (const f of Object.values(T.Torso)) cloth(g, f, base, 0, 1, seed);
    for (const L of LIMBS) {
      for (const s of SIDES) { cloth(g, L[s], base, 0, 0.8, seed); band(g, L[s], shade(base, -0.3), 0.74, 0.8, true); }
      for (const s of ["L", "R"] as const) { const [x, y, w, h] = L[s]; g.fillStyle = accent; g.fillRect(x + w / 2 - 5, y, 10, h * 0.74); }
      cloth(g, L.U, accent);
    }
    const [fx, fy, fw, fh] = T.Torso.F;
    g.fillStyle = accent; g.beginPath(); g.moveTo(fx, fy + fh * 0.35); g.lineTo(fx + fw, fy + fh * 0.1); g.lineTo(fx + fw, fy + fh * 0.22); g.lineTo(fx, fy + fh * 0.47); g.fill();
    g.fillStyle = "#d8d8d8"; g.fillRect(fx + fw / 2 - 1.5, fy, 3, fh); // zip
    band(g, T.Torso.F, shade(base, -0.3), 0.9, 1, true);
    text(g, num, fx + fw * 0.75, fy + fh * 0.62, 22, "#ffffff");
    const [bx, by, bw, bh] = T.Torso.B; text(g, team, bx + bw / 2, by + 26, 18, accent); text(g, num, bx + bw / 2, by + bh * 0.58, 58, "#ffffff");
    band(g, T.Torso.F, accent, 0, 0.05); band(g, T.Torso.B, accent, 0, 0.05);
  });
}
export function chefJacket(seed = 3) {
  return sheet((g) => {
    for (const f of Object.values(T.Torso)) cloth(g, f, "#f4f1ea", 0, 1, seed);
    for (const L of LIMBS) { for (const s of SIDES) { cloth(g, L[s], "#f4f1ea", 0, 0.5, seed); band(g, L[s], "#e2ddd2", 0.42, 0.5); } cloth(g, L.U, "#f4f1ea"); } // rolled sleeves: forearms bare
    const [fx, fy, fw, fh] = T.Torso.F;
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { g.fillStyle = "#2b2b2b"; g.beginPath(); g.arc(fx + fw / 2 + s * 18, fy + 22 + i * 16, 3.4, 0, 7); g.fill(); }
    // checked apron over the belly and the back strings
    const ax = fx + 14, ay = fy + fh * 0.55, aw = fw - 28, ah = fh * 0.45;
    for (let i = 0; i < aw; i += 10) for (let j = 0; j < ah; j += 10) { g.fillStyle = ((i + j) / 10) % 2 ? "#c0392b" : "#f6e6e3"; g.fillRect(ax + i, ay + j, 10, 10); }
    g.fillStyle = "#c0392b"; g.fillRect(fx, ay - 4, fw, 6); band(g, T.Torso.B, "#c0392b", 0.55, 0.6);
  });
}
export function uniformShirt(tie: string, seed = 4) {
  return sheet((g) => {
    for (const f of Object.values(T.Torso)) cloth(g, f, "#f5f7fb", 0, 1, seed);
    for (const L of LIMBS) { for (const s of SIDES) { cloth(g, L[s], "#f5f7fb", 0, 0.3, seed); band(g, L[s], "#dde3ee", 0.26, 0.3); } cloth(g, L.U, "#f5f7fb"); } // short sleeves
    const [fx, fy, fw, fh] = T.Torso.F;
    g.fillStyle = tie; g.beginPath(); g.moveTo(fx + fw / 2 - 7, fy + 10); g.lineTo(fx + fw / 2 + 7, fy + 10); g.lineTo(fx + fw / 2 + 9, fy + fh * 0.6); g.lineTo(fx + fw / 2, fy + fh * 0.68); g.lineTo(fx + fw / 2 - 9, fy + fh * 0.6); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(fx + fw / 2 - 26, fy); g.lineTo(fx + fw / 2, fy + 14); g.lineTo(fx + fw / 2 + 26, fy); g.fill(); // collar
    g.fillStyle = "#2e5aac"; g.fillRect(fx + 18, fy + 26, 22, 18); text(g, "S", fx + 29, fy + 35, 12, "#ffd166"); // school badge
  });
}
export function tee(base: string, print: string, seed = 5) {
  return sheet((g) => {
    for (const f of Object.values(T.Torso)) cloth(g, f, base, 0, 1, seed);
    for (const L of LIMBS) { for (const s of SIDES) { cloth(g, L[s], base, 0, 0.32, seed); band(g, L[s], shade(base, -0.2), 0.28, 0.32); } cloth(g, L.U, base); }
    const [fx, fy, fw] = T.Torso.F; text(g, print, fx + fw / 2, fy + 58, print.length > 4 ? 20 : 34, shade(base, 0.6));
    band(g, T.Torso.F, shade(base, -0.2), 0, 0.04);
  });
}

// ---- pants (legs use the limb rects; the torso's bottom is the belt line) ----
function shoes(g: CanvasRenderingContext2D, colour: string, stripe: string) {
  for (const L of LIMBS) {
    for (const s of SIDES) { cloth(g, L[s], colour, 0.86, 1); band(g, L[s], "#e9e9e9", 0.95, 1); }
    for (const s of ["L", "R"] as const) { const [x, y, w, h] = L[s]; g.strokeStyle = stripe; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 8, y + h * 0.93); g.quadraticCurveTo(x + w / 2, y + h * 0.86, x + w - 6, y + h * 0.89); g.stroke(); }
    cloth(g, L.D, "#e9e9e9");
  }
}
export function cargo(base: string, shoe = "#f2f2f2", stripe = "#00e5ff", seed = 6) {
  return sheet((g) => {
    for (const L of LIMBS) { for (const s of SIDES) { cloth(g, L[s], base, 0, 0.86, seed); band(g, L[s], shade(base, -0.25), 0.8, 0.86, true); } cloth(g, L.U, base); }
    for (const L of LIMBS) for (const s of ["L", "R"] as const) { const [x, y, w, h] = L[s]; g.fillStyle = shade(base, -0.12); g.fillRect(x + 8, y + h * 0.32, w - 16, h * 0.18); seam(g, x + 8, y + h * 0.32, x + w - 8, y + h * 0.32); }
    for (const s of SIDES) cloth(g, T.Torso[s], base, 0.8, 1, seed);
    band(g, T.Torso.F, "#1d1d1d", 0.8, 0.84); band(g, T.Torso.B, "#1d1d1d", 0.8, 0.84);
    shoes(g, shoe, stripe);
  });
}
export function jeans(base = "#2f4f7f", shoe = "#f2f2f2", stripe = "#ff2e88", seed = 7) {
  return sheet((g) => {
    for (const L of LIMBS) { for (const s of SIDES) { cloth(g, L[s], base, 0, 0.86, seed); const [x, y, w, h] = L[s]; seam(g, x + w / 2, y, x + w / 2, y + h * 0.86, "rgba(230,180,90,0.55)", 1.2); g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 6, y + h * 0.42, w - 12, h * 0.1); } cloth(g, L.U, base); }
    for (const s of SIDES) cloth(g, T.Torso[s], base, 0.8, 1, seed);
    band(g, T.Torso.F, "#3d2b1f", 0.8, 0.84); band(g, T.Torso.B, "#3d2b1f", 0.8, 0.84);
    shoes(g, shoe, stripe);
  });
}
export function shorts(base: string, sock = "#ffffff", shoe = "#222831", seed = 8) {
  return sheet((g) => {
    for (const L of LIMBS) { for (const s of SIDES) { cloth(g, L[s], base, 0, 0.3, seed); band(g, L[s], sock, 0.72, 0.86); } cloth(g, L.U, base); }
    for (const s of SIDES) cloth(g, T.Torso[s], base, 0.8, 1, seed);
    shoes(g, shoe, "#ffd166");
  });
}

/** lighten (+) or darken (-) a #rrggbb colour */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return "#" + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
