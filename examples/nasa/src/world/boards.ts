// Drawn screens and boards: every piece of on-screen text in the story (the laptop and monitor screens, the CTF
// lobby and scoreboard, the conference banners, the progress report, the receipt, the posters). Real brand and
// event names appear only as plain text, never as logos. Drawn in code because no asset carries these words;
// each `set(key, p)` redraws only when what it shows changes (frame-pure: the picture is a function of key and p).
import * as THREE from "three";
import { rng } from "../kit/rng";
import { BRAND, type BrandName } from "./brands";

const FONT = "Arial Black, Arial, sans-serif";
const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

/** A flat glowing panel (a screen) whose picture is drawn by `draw(g, key, p)` whenever key or p changes. */
function panel(w: number, h: number, px: number, draw: (g: CanvasRenderingContext2D, W: number, H: number, key: string, p: number) => void, emissive = true) {
  const W = px, H = Math.round((px * h) / w), c = canvas(W, H), g = c.getContext("2d")!, t = tex(c);
  const mat = emissive ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat) as unknown as THREE.Mesh & { set(key: string, p?: number): void };
  let last = "";
  mesh.set = (key, p = 0) => { const k = key + "|" + p.toFixed(2); if (k === last) return; last = k; g.clearRect(0, 0, W, H); draw(g, W, H, key, p); t.needsUpdate = true; };
  mesh.userData.noCollide = true;
  return mesh;
}
const centre = (g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, colour: string, maxW?: number) => {
  g.font = `900 ${size}px ${FONT}`; g.fillStyle = colour; g.textAlign = "center"; g.textBaseline = "middle";
  if (maxW) { const w = g.measureText(text).width; if (w > maxW) g.font = `900 ${Math.floor((size * maxW) / w)}px ${FONT}`; }
  g.fillText(text, x, y);
};
const left = (g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, colour: string) => { g.font = `800 ${size}px ${FONT}`; g.fillStyle = colour; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(text, x, y); };
const lock = (g: CanvasRenderingContext2D, x: number, y: number, s: number, colour: string) => {
  g.strokeStyle = colour; g.lineWidth = s * 0.16; g.beginPath(); g.arc(x, y - s * 0.35, s * 0.32, Math.PI, 0); g.stroke();
  g.fillStyle = colour; g.fillRect(x - s * 0.5, y - s * 0.35, s, s * 0.8); g.fillStyle = "#000"; g.fillRect(x - s * 0.07, y - s * 0.05, s * 0.14, s * 0.3);
};
const check = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.fillStyle = "#1fd15a"; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#fff"; g.lineWidth = s * 0.25; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x - s * 0.12, y + s * 0.4); g.lineTo(x + s * 0.55, y - s * 0.4); g.stroke();
};
/** A real image (src/world/brands.ts) cover-fitted into a box, or a circle; a grey box when it is missing. */
const pic = (g: CanvasRenderingContext2D, name: BrandName, x: number, y: number, w: number, h: number, round = false, crop = 1) => {
  const img = BRAND[name]; g.save(); g.beginPath();
  if (round) g.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2); else g.rect(x, y, w, h);
  g.clip();
  if (img) { const k = Math.max(w / img.width, h / img.height) / crop, iw = img.width * k, ih = img.height * k; g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
  else { g.fillStyle = "#555"; g.fillRect(x, y, w, h); }
  g.restore();
};
/** A YouTube-style video card: thumbnail, round channel avatar, title and channel name. */
const videoCard = (g: CanvasRenderingContext2D, thumb: BrandName, avatar: BrandName, title: string, channel: string, x: number, y: number, w: number, dark = true) => {
  const th = w * 9 / 16; pic(g, thumb, x, y, w, th);
  g.fillStyle = "rgba(0,0,0,0.8)"; g.fillRect(x + w - w * 0.17, y + th - w * 0.09, w * 0.15, w * 0.07); g.font = `700 ${w * 0.045}px Arial`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("12:34", x + w - w * 0.095, y + th - w * 0.055);
  const a = w * 0.13; pic(g, avatar, x, y + th + w * 0.03, a, a, true);
  g.textAlign = "left"; g.font = `800 ${w * 0.058}px Arial`; g.fillStyle = dark ? "#fff" : "#111"; g.fillText(title, x + a + w * 0.04, y + th + w * 0.075);
  g.font = `600 ${w * 0.05}px Arial`; g.fillStyle = dark ? "#aaa" : "#555"; g.fillText(channel + " ✓", x + a + w * 0.04, y + th + w * 0.15);
};
/** A browser window: dark frame, tab strip with these titles, page area returned for drawing. */
const browser = (g: CanvasRenderingContext2D, W: number, H: number, tabs: string[], active = 0) => {
  g.fillStyle = "#1b1f2a"; g.fillRect(0, 0, W, H);
  const tw = Math.min(W / tabs.length, W * 0.4);
  tabs.forEach((t, i) => { g.fillStyle = i === active ? "#2f3647" : "#232838"; g.fillRect(i * tw + 4, 6, tw - 8, H * 0.11); g.font = `700 ${Math.round(H * 0.05)}px Arial`; g.fillStyle = "#e8ecf5"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(t.length > 18 ? t.slice(0, 17) + "…" : t, i * tw + 16, 6 + H * 0.055); });
  g.fillStyle = "#0e1118"; g.fillRect(0, H * 0.13, W, H * 0.87);
  return { x: 0, y: H * 0.13, w: W, h: H * 0.87 };
};

/** The desk monitor / laptop screen: every story state keyed by docs/story.md `screen:`. */
export function screen(w = 3.4, h = 2.1) {
  return panel(w, h, 1024, (g, W, H, key, p) => {
    const K = key.toUpperCase();
    if (!key) { g.fillStyle = "#0b1020"; g.fillRect(0, 0, W, H); centre(g, "> _", W / 2, H / 2, H * 0.12, "#3dff8b"); return; }
    if (K.startsWith("NASA")) { // NASA: LOCKED (the hook): red lock on black
      g.fillStyle = "#12030a"; g.fillRect(0, 0, W, H); g.strokeStyle = "#ff2d3d"; g.lineWidth = 14; g.strokeRect(20, 20, W - 40, H - 40);
      lock(g, W / 2, H * 0.36, H * 0.26, "#ff2d3d"); centre(g, "NASA: LOCKED", W / 2, H * 0.75, H * 0.15, "#ff2d3d", W * 0.85); return;
    }
    if (K === "TCP1P") { const r = browser(g, W, H, ["target-site", "notes"]); for (let i = 0; i < 7; i++) left(g, ["$ nmap target", "80/tcp open http", "$ sqlmap -u ...", "[+] injectable!", "> dumping...", "", ""][i], 30, r.y + 50 + i * 70, 44, "#3dff8b"); return; }
    if (K === "WEBSITE HACKED") { g.fillStyle = p > 0.5 ? "#0b3b18" : "#0b1020"; g.fillRect(0, 0, W, H); check(g, W / 2, H * 0.36, H * 0.18); centre(g, "WEBSITE HACKED", W / 2, H * 0.74, H * 0.13, "#3dff8b", W * 0.9); return; }
    if (K.startsWith("BEDTIME")) { // the tablet's playlist: the real channels' thumbnails and avatars, YouTube style
      g.fillStyle = "#0f0f0f"; g.fillRect(0, 0, W, H); centre(g, "🌙 BEDTIME PLAYLIST", W / 2, H * 0.05, H * 0.04, "#ffd166");
      videoCard(g, "thumbLO2", "liveoverflow", "Zenbleed: Novel CPU Fuzzing", "LiveOverflow", W * 0.06, H * 0.09, W * 0.88);
      videoCard(g, "thumbJH", "johnhammond", "Inside the Dark Web", "John Hammond", W * 0.06, H * 0.55, W * 0.88);
      return;
    }
    if (K === "SCHEDULE") { // what he really learned: her streaming schedule
      g.fillStyle = "#1a0f24"; g.fillRect(0, 0, W, H); pic(g, "kurenaif", W * 0.04, H * 0.06, H * 0.3, H * 0.3, true);
      left(g, "kurenaif", W * 0.04 + H * 0.34, H * 0.15, H * 0.1, "#ff7ad9"); left(g, "STREAM SCHEDULE", W * 0.04 + H * 0.34, H * 0.28, H * 0.07, "#fff");
      [["MON", "21:00  LIVE crypto"], ["WED", "21:00  LIVE pwn"], ["SAT", "15:00  CTF writeup"]].forEach(([d, t], i) => { const y = H * (0.46 + i * 0.17); g.fillStyle = "#3a2252"; g.fillRect(W * 0.04, y, W * 0.92, H * 0.14); left(g, d, W * 0.07, y + H * 0.07, H * 0.075, "#ffd166"); left(g, t, W * 0.25, y + H * 0.07, H * 0.075, "#fff"); g.strokeStyle = "#3dff8b"; g.lineWidth = 8; g.beginPath(); g.moveTo(W * 0.86, y + H * 0.07); g.lineTo(W * 0.89, y + H * 0.1); g.lineTo(W * 0.94, y + H * 0.03); g.stroke(); });
      return;
    }
    if (K === "KURENAIF") { // my best friend's screen: a kurenaif crypto video, YouTube style
      g.fillStyle = "#0f0f0f"; g.fillRect(0, 0, W, H);
      const w = W * 0.62, th = w * 9 / 16; pic(g, "kfCrypto", W * 0.04, H * 0.06, w, th);
      pic(g, "kurenaif", W * 0.04, H * 0.06 + th + H * 0.04, H * 0.14, H * 0.14, true);
      left(g, "CTF Crypto 超入門", W * 0.04 + H * 0.17, H * 0.06 + th + H * 0.08, H * 0.065, "#fff"); left(g, "kurenaif ✓", W * 0.04 + H * 0.17, H * 0.06 + th + H * 0.16, H * 0.05, "#aaa");
      ["kfReed", "kfDefcon", "kfHeap"].forEach((t, i) => pic(g, t as BrandName, W * 0.69, H * (0.06 + i * 0.31), W * 0.28, W * 0.28 * 9 / 16));
      return;
    }
    if (K.startsWith("PRESCHOOL")) return lobby(g, W, H, p);
    if (K.startsWith("FINAL")) { g.fillStyle = "#1a0d24"; g.fillRect(0, 0, W, H); centre(g, "FINAL CHALLENGE", W / 2, H * 0.32, H * 0.14, "#ffd166", W * 0.9); centre(g, "ONE FLAG LEFT", W / 2, H * 0.6, H * 0.12, "#ff5d8f", W * 0.9); g.fillStyle = "#3dff8b"; g.fillRect(W * 0.15, H * 0.78, W * 0.7 * 0.92, H * 0.06); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(W * 0.15, H * 0.78, W * 0.7, H * 0.06); return; }
    if (K.startsWith("MIC")) { g.fillStyle = "#1b1f2a"; g.fillRect(0, 0, W, H); centre(g, "MIC DISCONNECTED", W / 2, H * 0.45, H * 0.12, "#ff5d5d", W * 0.9); centre(g, "♪ ♫ ♪", W / 2, H * 0.68, H * 0.12, "#a9c8ff"); return; }
    if (K.startsWith("OSCP")) return certificate(g, W, H);
    if (K.startsWith("BUG BOUNTY")) { const r = browser(g, W, H, ["HackerOne", "Bugcrowd", "PortSwigger Web Security Academy"]); left(g, "Submit report", 30, r.y + 60, 50, "#fff"); for (let i = 0; i < 5; i++) { g.fillStyle = "#232838"; g.fillRect(30, r.y + 120 + i * 70, W * (0.5 + 0.08 * (i % 3)), 40); } return; }
    if (K.startsWith("REPORT ACCEPTED")) { const r = browser(g, W, H, ["HackerOne", "Bugcrowd", "PortSwigger Web Security Academy"]); g.fillStyle = "#123d22"; g.fillRect(W * 0.08, r.y + r.h * 0.12, W * 0.84, r.h * 0.72); check(g, W * 0.2, r.y + r.h * 0.48, H * 0.11); left(g, "REPORT ACCEPTED", W * 0.33, r.y + r.h * 0.34, H * 0.08, "#fff"); left(g, "$5,000 REWARD", W * 0.33, r.y + r.h * 0.6, H * 0.12, "#3dff8b"); return; }
    if (K.startsWith("BALANCE")) { // $5,000 -> $0 across the shot
      g.fillStyle = "#0e1118"; g.fillRect(0, 0, W, H); centre(g, "BALANCE", W / 2, H * 0.25, H * 0.09, "#a9b3c9");
      const v = Math.round(5000 * Math.max(0, 1 - p * 2.2)); centre(g, "$" + v.toLocaleString("en-US"), W / 2, H * 0.55, H * 0.24, v ? "#3dff8b" : "#ff4d4d");
      if (p > 0.5) centre(g, "TRANSFERRED TO: MOM", W / 2, H * 0.82, H * 0.07, "#ff9f9f"); return;
    }
    if (K.startsWith("PRACTICE")) { const tabs = ["CTFtime", "picoCTF", "Hack The Box"], a = Math.floor(p * 9) % 3, r = browser(g, W, H, tabs, a); for (let i = 0; i < 7; i++) left(g, ["$ ./exploit", "flag{...}", "solves: " + (12 + Math.floor(p * 300)), "> next challenge", "$ gdb ./bin", "pwndbg>", ""][(i + a) % 7], 30, r.y + 50 + i * 66, 42, "#3dff8b"); return; }
    if (K.startsWith("READY")) { g.fillStyle = "#0d1424"; g.fillRect(0, 0, W, H); g.fillStyle = "#1f6fe0"; g.fillRect(W * 0.18, H * 0.38, W * 0.64, H * 0.26); centre(g, "READY TO SUBMIT", W / 2, H * 0.51, H * 0.1, "#fff", W * 0.6); centre(g, "press ENTER", W / 2, H * 0.78, H * 0.06, "#7f8aa3"); return; }
    if (K.startsWith("ACCESS")) { g.fillStyle = "#08301a"; g.fillRect(0, 0, W, H); check(g, W / 2, H * 0.36, H * 0.2); centre(g, "ACCESS GRANTED", W / 2, H * 0.76, H * 0.15, "#3dff8b", W * 0.9); return; }
    if (K.startsWith("NEW OBJECTIVE")) { g.fillStyle = "#2a1600"; g.fillRect(0, 0, W, H); g.fillStyle = "#ffb703"; g.beginPath(); g.arc(W / 2, H * 0.32, H * 0.16, 0, Math.PI * 2); g.fill(); centre(g, "NEW OBJECTIVE:", W / 2, H * 0.62, H * 0.08, "#ffe8b0"); centre(g, "HACK THE SUN", W / 2, H * 0.78, H * 0.13, "#ffb703", W * 0.9); centre(g, "before ELEVEN", W / 2, H * 0.91, H * 0.06, "#ffe8b0"); return; }
    if (K.startsWith("PROGRESS")) return report(g, W, H);
    if (K === "RECEIPT") return receipt(g, W, H);
    g.fillStyle = "#0b1020"; g.fillRect(0, 0, W, H); centre(g, key, W / 2, H / 2, H * 0.1, "#fff", W * 0.9);
  });
}

function lobby(g: CanvasRenderingContext2D, W: number, H: number, _p: number) {
  g.fillStyle = "#1a1030"; g.fillRect(0, 0, W, H);
  centre(g, "PRESCHOOL CTF LEAGUE", W / 2, H * 0.1, H * 0.075, "#ffd166", W * 0.92);
  const teams = [["Project SEKAI", 9850], ["PPP", 9620], ["DiceGang", 9410], ["TokyoWesterns", 9300], ["MILK DEPENDENCY", 9295]];
  const logos: Record<string, BrandName> = { "Project SEKAI": "sekai", PPP: "ppp" };
  teams.forEach(([n, s], i) => {
    const y = H * (0.2 + i * 0.155), ours = i === 4, rowH = H * 0.135, logo = logos[n as string];
    g.fillStyle = ours ? "#3a2a10" : logo ? "#3a2266" : "#261a40"; g.fillRect(W * 0.04, y, W * 0.92, rowH);
    if (logo) { g.fillStyle = "#fff"; g.fillRect(W * 0.06, y + rowH * 0.08, rowH * 0.84, rowH * 0.84); pic(g, logo, W * 0.06, y + rowH * 0.08, rowH * 0.84, rowH * 0.84); }
    else { g.fillStyle = ours ? "#ffd166" : "#55407a"; g.fillRect(W * 0.06, y + rowH * 0.08, rowH * 0.84, rowH * 0.84); centre(g, ours ? "🍼" : String(n)[0], W * 0.06 + rowH * 0.42, y + rowH / 2, rowH * 0.5, ours ? "#3a2a10" : "#fff"); }
    left(g, `${i + 1}. ${n}`, W * 0.06 + rowH, y + rowH / 2, H * 0.065, ours ? "#ffd166" : "#fff"); g.textAlign = "right"; g.fillStyle = "#9fe08a"; g.fillText(String(s), W * 0.94, y + rowH / 2);
  });
}
function certificate(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#fbf6e6"; g.fillRect(0, 0, W, H); g.strokeStyle = "#c9a227"; g.lineWidth = 16; g.strokeRect(14, 14, W - 28, H - 28);
  centre(g, "CERTIFICATE", W / 2, H * 0.2, H * 0.08, "#7a5a10"); centre(g, "OSCP", W / 2, H * 0.47, H * 0.22, "#1d2a44"); centre(g, "PASSED", W / 2, H * 0.73, H * 0.12, "#1a8a3a");
  g.fillStyle = "#c9a227"; g.beginPath(); g.arc(W * 0.85, H * 0.8, H * 0.09, 0, Math.PI * 2); g.fill();
}
function report(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#fdfdf8"; g.fillRect(0, 0, W, H);
  centre(g, "PROGRESS REPORT", W / 2, H * 0.12, H * 0.085, "#1d2a44", W * 0.9); g.fillStyle = "#1d2a44"; g.fillRect(W * 0.08, H * 0.2, W * 0.84, 4);
  [["OSCP", "PASSED", "#1a8a3a"], ["OSWE", "PASSED", "#1a8a3a"], ["NASA", "F", "#e01b24"]].forEach(([a, b, c], i) => {
    const y = H * (0.34 + i * 0.2); left(g, a + ":", W * 0.12, y, H * 0.1, "#1d2a44"); g.font = `900 ${H * (b === "F" ? 0.17 : 0.1)}px ${FONT}`; g.fillStyle = c; g.textAlign = "right"; g.fillText(b, W * 0.88, y);
  });
  g.strokeStyle = "#e01b24"; g.lineWidth = 8; g.beginPath(); g.ellipse(W * 0.82, H * 0.74, W * 0.1, H * 0.11, 0, 0, Math.PI * 2); g.stroke();
}
function receipt(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#fffef6"; g.fillRect(0, 0, W, H);
  centre(g, "RECEIPT", W / 2, H * 0.1, H * 0.08, "#222");
  const dash = (y: number) => { g.strokeStyle = "#999"; g.setLineDash([12, 10]); g.lineWidth = 3; g.beginPath(); g.moveTo(W * 0.06, y); g.lineTo(W * 0.94, y); g.stroke(); g.setLineDash([]); };
  dash(H * 0.2); centre(g, "SOLAR STARTER KIT", W / 2, H * 0.33, H * 0.068, "#222", W * 0.88); left(g, "1 x sunscreen (tiny)", W * 0.07, H * 0.45, H * 0.05, "#555");
  dash(H * 0.56); left(g, "TOTAL", W * 0.07, H * 0.68, H * 0.08, "#222"); g.textAlign = "right"; g.fillText("$5,000", W * 0.93, H * 0.68);
  g.save(); g.translate(W * 0.62, H * 0.86); g.rotate(-0.18); g.strokeStyle = "#d61f2c"; g.lineWidth = 9; g.strokeRect(-W * 0.2, -H * 0.07, W * 0.4, H * 0.14); centre(g, "PAID", 0, 0, H * 0.1, "#d61f2c"); g.restore();
}

/** A wide banner or poster with plain-text lines (conference names, the kurenaif fan posters, a sticky note). */
export function banner(lines: string[], w: number, h: number, bg = "#14213d", fg = "#ffffff", accent = "#fca311") {
  const m = panel(w, h, 1024, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = accent; g.fillRect(0, H * 0.88, W, H * 0.12); g.fillRect(0, 0, W, H * 0.04);
    lines.forEach((l, i) => centre(g, l, W / 2, H * (lines.length === 1 ? 0.46 : 0.3 + i * (0.5 / Math.max(1, lines.length - 1))), H * (i ? 0.13 : 0.24), i ? accent : fg, W * 0.88));
  }, false);
  m.set("x"); return m;
}

/** A poster or wallpaper: a real image filling the panel, with an optional caption strip. */
export function poster(name: BrandName, w: number, h: number, caption = "", bg = "#6b2fb3", glow = false) {
  const m = panel(w, h, 1024, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const capH = caption ? H * 0.16 : 0; pic(g, name, W * 0.03, W * 0.03, W * 0.94, H - capH - W * 0.06);
    if (caption) centre(g, caption, W / 2, H - capH / 2 - W * 0.01, capH * 0.62, "#fff", W * 0.9);
  }, glow);
  m.set("x"); return m;
}

/** The full-body kurenaif standee (a cardboard cutout): her real avatar art for the head, a drawn body in her
 *  colours (pink hair, black witch hat, black-and-white dress), cut out with alpha, on a cardboard stand. */
export function standee(height = 6.5) {
  const W = 512, H = 1280, c = canvas(W, H), g = c.getContext("2d")!;
  const cx = W / 2;
  // hair falling behind the body
  g.fillStyle = "#f08cc8"; g.beginPath(); g.moveTo(cx - 150, 330); g.quadraticCurveTo(cx - 210, 640, cx - 150, 760); g.lineTo(cx + 150, 760); g.quadraticCurveTo(cx + 210, 640, cx + 150, 330); g.fill();
  // dress: black bodice, white collar and apron, a flared skirt with pink trim
  g.fillStyle = "#1c1424"; g.beginPath(); g.moveTo(cx - 95, 420); g.lineTo(cx + 95, 420); g.lineTo(cx + 120, 640); g.lineTo(cx + 215, 960); g.lineTo(cx - 215, 960); g.lineTo(cx - 120, 640); g.closePath(); g.fill();
  g.fillStyle = "#ff7ad9"; g.fillRect(cx - 215, 940, 430, 22);
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(cx - 70, 420); g.lineTo(cx + 70, 420); g.lineTo(cx + 30, 500); g.lineTo(cx - 30, 500); g.fill();
  g.beginPath(); g.moveTo(cx - 60, 560); g.lineTo(cx + 60, 560); g.lineTo(cx + 110, 900); g.lineTo(cx - 110, 900); g.closePath(); g.fill();
  g.fillStyle = "#d61f6a"; g.beginPath(); g.moveTo(cx, 470); g.lineTo(cx - 40, 445); g.lineTo(cx - 40, 495); g.closePath(); g.moveTo(cx, 470); g.lineTo(cx + 40, 445); g.lineTo(cx + 40, 495); g.closePath(); g.fill();
  // arms (one holding a little key), legs, boots
  g.fillStyle = "#1c1424"; g.save(); g.translate(cx - 100, 440); g.rotate(0.35); g.fillRect(-28, 0, 56, 220); g.restore(); g.save(); g.translate(cx + 100, 440); g.rotate(-0.6); g.fillRect(-28, 0, 56, 200); g.restore();
  g.fillStyle = "#fbe4dc"; g.beginPath(); g.arc(cx - 172, 640, 30, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cx + 214, 600, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffd166"; g.fillRect(cx + 230, 560, 14, 70); g.beginPath(); g.arc(cx + 237, 552, 20, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fbe4dc"; g.fillRect(cx - 70, 960, 44, 200); g.fillRect(cx + 26, 960, 44, 200);
  g.fillStyle = "#1c1424"; g.fillRect(cx - 82, 1110, 68, 90); g.fillRect(cx + 14, 1110, 68, 90);
  // the head: her real avatar art in a circle, with a black witch hat on top
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(cx, 270, 178, 0, Math.PI * 2); g.fill();
  pic(g, "kurenaif", cx - 170, 100, 340, 340, true, 1.05);
  // name plate
  g.fillStyle = "#6b2fb3"; g.fillRect(cx - 170, 1205, 340, 70); centre(g, "kurenaif", cx, 1241, 52, "#ffffff", 320);
  // a white cardboard border round the whole cut-out (drawn behind: dilate by stroking the alpha shape)
  const out = canvas(W, H), o = out.getContext("2d")!;
  for (let a = 0; a < 16; a++) o.drawImage(c, Math.cos((a / 16) * Math.PI * 2) * 9, Math.sin((a / 16) * Math.PI * 2) * 9);
  o.globalCompositeOperation = "source-in"; o.fillStyle = "#f4f1ea"; o.fillRect(0, 0, W, H); o.globalCompositeOperation = "source-over"; o.drawImage(c, 0, 0);
  const t = tex(out), w = height * (W / H);
  const grp = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, height), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }));
  face.position.y = height / 2 + 0.05; face.castShadow = true; face.receiveShadow = true;
  face.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
  grp.add(face);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.1, 0.9), new THREE.MeshStandardMaterial({ color: "#b48a5a", roughness: 0.9 })); foot.position.set(0, 0.05, -0.3); foot.castShadow = true; grp.add(foot);
  return grp;
}

/** The kurenaif fan-club flag (her real avatar and FAN CLUB, the friend's running gag), on a stick held +Y up. */
export function fanFlag(size = 1.6) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, size * 1.6, 8), new THREE.MeshStandardMaterial({ color: "#8a5a2b", roughness: 0.7 }));
  stick.position.y = size * 0.5; stick.castShadow = true; g.add(stick);
  const cloth = poster("kurenaif", size * 1.3, size * 1.05, "FAN CLUB", "#6b2fb3");
  cloth.position.set(size * 0.68, size * 1.0, 0.01); g.add(cloth);
  const back = poster("kurenaif", size * 1.3, size * 1.05, "FAN CLUB", "#6b2fb3"); back.rotation.y = Math.PI; back.position.set(size * 0.68, size * 1.0, -0.01); g.add(back);
  return g;
}

/** The countdown above my head (docs/story.md `timer:`), a camera-facing sprite: big red digits, a line under them. */
export function timerTag() {
  const W = 900, H = 340, c = canvas(W, H), g = c.getContext("2d")!, t = tex(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, toneMapped: false, depthTest: false, transparent: true })) as THREE.Sprite & { set(text: string, p: number): void };
  sprite.renderOrder = 10; sprite.scale.set(3.6, 3.6 * (H / W), 1); sprite.userData.noCollide = true;
  let last = "";
  sprite.set = (text, p) => {
    // "10TH BIRTHDAY IN 00:40 -> 00:10" counts down across the shot; the digits are the last mm:ss in the text
    const [a, b] = text.split("->").map((s) => s.trim());
    const secs = (s: string) => { const m = /(\d+):(\d+)\s*$/.exec(s); return m ? +m[1] * 60 + +m[2] : null; };
    let label = a, digits = "";
    const sa = secs(a);
    if (sa !== null) { const sb = b ? secs(b) ?? sa : sa, v = Math.round(sa + (sb - sa) * p); digits = `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; label = a.replace(/\d+:\d+\s*$/, "").trim(); }
    else { const m = /^(.*?)(\d+ DAYS)$/.exec(a); if (m) { label = m[1].trim(); digits = m[2]; } }
    const k = label + digits; if (k === last) return; last = k;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(10,0,4,0.72)"; g.beginPath(); g.roundRect(20, 20, W - 40, H - 40, 40); g.fill();
    g.strokeStyle = "#ff2d3d"; g.lineWidth = 10; g.stroke();
    const urgent = digits && /^00:0\d$/.test(digits);
    centre(g, digits || label, W / 2, digits ? H * 0.42 : H / 2, digits.length > 6 ? H * 0.3 : H * 0.42, urgent ? "#ff3b3b" : digits.includes("DAYS") ? "#ffb703" : "#ff5a5a", W * 0.86);
    if (digits && label) centre(g, label, W / 2, H * 0.78, H * 0.13, "#ffd9dc", W * 0.86);
    t.needsUpdate = true;
  };
  return sprite;
}

/** A calendar page on the wall whose day advances with p (the practice montage). */
export function calendar(w = 2.2, h = 2.6) {
  return panel(w, h, 512, (g, W, H, _k, p) => {
    const day = 1 + Math.floor(p * 360), months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.fillStyle = "#d62f2f"; g.fillRect(0, 0, W, H * 0.28);
    centre(g, months[Math.min(11, Math.floor((day - 1) / 30))], W / 2, H * 0.14, H * 0.16, "#fff"); centre(g, String(((day - 1) % 30) + 1), W / 2, H * 0.62, H * 0.42, "#222");
  }, false);
}

/** Seeded noise, so the boards that use it look the same in every render tab. */
export const boardSeed = rng(77);
