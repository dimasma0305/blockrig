// Drawn boards for the secret room and the village: the King's map of the kingdom (every forest crossed out
// in red, one left with a circle), the ledger (1 coin in, 100 out), the King's portrait (the painting that is a
// door), the crown logo on his oil barrels and the school sign. They are story props with words and marks no
// downloaded asset has, so they are drawn in code (seeded, frame-pure). The crossed-out marks appear by progress.
import * as THREE from "three";
import { rng } from "../kit/rng";

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const board = (tex: THREE.Texture, w: number, h: number, frame = "#5a3a1e") => {
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, h + 0.8, 0.4), new THREE.MeshStandardMaterial({ color: frame, roughness: 0.6, metalness: frame === "#c9a227" ? 0.7 : 0 }));
  back.castShadow = true; g.add(back);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })); face.position.z = 0.21; g.add(face);
  return g;
};

/** Forest blobs on the map (u, v in 0..1); the last one is Grandpa's. */
export const MAP_FORESTS = (() => { const r = rng(31), out: [number, number][] = []; for (let i = 0; i < 13; i++) out.push([0.1 + r() * 0.8, 0.12 + r() * 0.72]); out.push([0.78, 0.7]); return out; })();

/** The King's map. `crossed` 0..1: how many of the forests carry their red X so far; `circle` draws the ring. */
export function kingdomMap(w = 22, h = 14) {
  const W = 1400, H = 900, r = rng(5);
  const base = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#e9d6a7"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,80,30,${r() * 0.06})`; g.fillRect(r() * W, r() * H, 3 + r() * 6, 3 + r() * 6); }
    // coast, river, roads
    g.strokeStyle = "#5a9bd4"; g.lineWidth = 16; g.beginPath(); g.moveTo(0, 650); g.bezierCurveTo(300, 560, 520, 760, 900, 600); g.bezierCurveTo(1100, 520, 1250, 640, 1400, 560); g.stroke();
    g.strokeStyle = "#a0754a"; g.lineWidth = 6; g.setLineDash([18, 12]); g.beginPath(); g.moveTo(140, 140); g.lineTo(700, 420); g.lineTo(1200, 260); g.moveTo(700, 420); g.lineTo(820, 820); g.stroke(); g.setLineDash([]);
    // the palace and the village
    g.fillStyle = "#c9a227"; g.beginPath(); g.moveTo(680, 380); g.lineTo(700, 330); g.lineTo(720, 380); g.lineTo(740, 340); g.lineTo(760, 380); g.lineTo(780, 330); g.lineTo(800, 380); g.lineTo(800, 420); g.lineTo(680, 420); g.fill();
    g.fillStyle = "#3b2a14"; g.font = "bold 44px serif"; g.fillText("THE KINGDOM", 520, 80); g.font = "bold 28px serif"; g.fillText("PALACE", 690, 460); g.fillText("VILLAGE", 860, 860);
    // forests
    MAP_FORESTS.forEach(([u, v], i) => {
      const x = u * W, y = v * H;
      for (let k = 0; k < 9; k++) { g.fillStyle = i === MAP_FORESTS.length - 1 ? "#2f8f3a" : "#3f7f35"; g.beginPath(); g.arc(x + (r() - 0.5) * 70, y + (r() - 0.5) * 50, 20 + r() * 14, 0, Math.PI * 2); g.fill(); }
    });
    g.strokeStyle = "#3b2a14"; g.lineWidth = 10; g.strokeRect(10, 10, W - 20, H - 20);
  };
  const tex = canvasTex(W, H, base), cv = (tex.image as HTMLCanvasElement), g = cv.getContext("2d")!;
  const clean = document.createElement("canvas"); clean.width = W; clean.height = H; clean.getContext("2d")!.drawImage(cv, 0, 0);
  let drawn = -1;
  const obj = board(tex, w, h) as THREE.Group & { set(crossed: number, circle: number): void; forest(i: number): THREE.Vector3 };
  obj.set = (crossed, circle) => {
    const key = Math.round(crossed * 100) * 1000 + Math.round(circle * 100);
    if (key === drawn) return; drawn = key;
    g.drawImage(clean, 0, 0);
    const n = Math.floor(crossed * (MAP_FORESTS.length - 1) + 1e-6);
    g.strokeStyle = "#d3121b"; g.lineWidth = 16; g.lineCap = "round";
    for (let i = 0; i < n; i++) { const [u, v] = MAP_FORESTS[i], x = u * W, y = v * H; g.beginPath(); g.moveTo(x - 48, y - 40); g.lineTo(x + 48, y + 40); g.moveTo(x + 48, y - 40); g.lineTo(x - 48, y + 40); g.stroke(); }
    if (circle > 0) { const [u, v] = MAP_FORESTS[MAP_FORESTS.length - 1]; g.lineWidth = 12; g.beginPath(); g.arc(u * W, v * H, 80, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * circle); g.stroke();
      g.fillStyle = "#d3121b"; g.font = "bold 40px serif"; if (circle >= 1) g.fillText("LAST ONE", u * W - 100, v * H - 100); }
    tex.needsUpdate = true;
  };
  /** Where forest i sits on the board, in the board's local space. */
  obj.forest = (i) => { const [u, v] = MAP_FORESTS[i]; return new THREE.Vector3((u - 0.5) * w, (0.5 - v) * h, 0.25); };
  obj.set(1, 0);
  return obj;
}

/** The ledger board: BUY 1 coin, SELL 100 coins, with the crown. */
export function ledger(w = 10, h = 8) {
  const tex = canvasTex(800, 640, (g) => {
    g.fillStyle = "#2b2420"; g.fillRect(0, 0, 800, 640);
    g.strokeStyle = "#c9a227"; g.lineWidth = 10; g.strokeRect(16, 16, 768, 608);
    g.fillStyle = "#f3e3b5"; g.font = "bold 54px serif"; g.textAlign = "center"; g.fillText("SAWIT LEDGER", 400, 96);
    g.font = "bold 46px sans-serif"; g.textAlign = "left";
    g.fillStyle = "#9fe08a"; g.fillText("BUY  from farmers:", 60, 230); g.fillText("1 coin", 560, 230);
    g.fillStyle = "#ffd166"; g.fillText("SELL as oil:", 60, 360); g.fillText("100 coins", 520, 360);
    g.fillStyle = "#ff5a5a"; g.fillText("FIRE: free", 60, 490); g.fillStyle = "#c9a227"; g.fillText("PROFIT: ALL", 400, 560);
  });
  return board(tex, w, h, "#c9a227");
}

/** The King's portrait in a gold frame (the painting that swings open). */
export function portrait(w = 7, h = 9) {
  const tex = canvasTex(560, 720, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 720); bg.addColorStop(0, "#5b1b2e"); bg.addColorStop(1, "#2a0d16"); g.fillStyle = bg; g.fillRect(0, 0, 560, 720);
    // a blocky king: shoulders in red and gold, a square head, a crown, a smile
    // shoulders in a blue batik shirt (dotted pattern), a black peci on top
    g.fillStyle = "#1f4e8c"; g.fillRect(90, 470, 380, 250); g.fillStyle = "#e9c46a"; for (let y = 490; y < 720; y += 34) for (let x = 105 + ((y / 34) % 2) * 17; x < 470; x += 34) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#f1c27d"; g.fillRect(170, 220, 220, 230);
    g.fillStyle = "#1a1a1a"; g.fillRect(225, 300, 26, 34); g.fillRect(310, 300, 26, 34); g.fillStyle = "#6b3a1e"; g.fillRect(200, 400, 160, 40);
    g.strokeStyle = "#1a1a1a"; g.lineWidth = 8; g.beginPath(); g.arc(280, 365, 40, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = "#1a1a1a"; g.beginPath(); g.moveTo(165, 240); g.lineTo(178, 150); g.lineTo(382, 150); g.lineTo(395, 240); g.closePath(); g.fill();
    g.fillStyle = "#f3e3b5"; g.font = "bold 40px serif"; g.textAlign = "center"; g.fillText("OUR KIND KING", 280, 80);
  });
  return board(tex, w, h, "#c9a227");
}

/** A crown logo decal (barrels, the badge, flags). */
export function crownLogo(size = 1.6, colour = "#f0c419") {
  const tex = canvasTex(256, 256, (g) => {
    g.fillStyle = colour; g.beginPath(); g.moveTo(40, 190); g.lineTo(40, 80); g.lineTo(90, 130); g.lineTo(128, 60); g.lineTo(166, 130); g.lineTo(216, 80); g.lineTo(216, 190); g.closePath(); g.fill();
    g.strokeStyle = "#3b2a14"; g.lineWidth = 10; g.stroke(); g.fillStyle = "#3b2a14"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.fillText("K.CO", 128, 238);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5 }));
  return m;
}

/** A painted wooden sign (the school). */
export function sign(text: string, w = 9, h = 2.4) {
  const tex = canvasTex(900, 240, (g) => { g.fillStyle = "#7a4e2a"; g.fillRect(0, 0, 900, 240); g.strokeStyle = "#3b2414"; g.lineWidth = 14; g.strokeRect(7, 7, 886, 226);
    g.fillStyle = "#fff4d6"; g.font = "bold 120px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 450, 125); });
  return board(tex, w, h, "#3b2414");
}
