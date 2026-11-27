// The neon world: a street of procedural towers and holograms, and the Vault plaza with its firewall dome.
// Built once; update(state, time, focus) poses everything for one frame from the story state.
import * as THREE from "three";
import { towerMaterial, domeMaterial, hologramMaterial, glyphAtlas, glyphRainMaterial, beam, burst, glow, searchlight, tick, setFog } from "./vfx";
import { STREET, BAKERY, SCHOOL, PX, VAULT, TERMINAL, BARRIER_Z } from "./layout";
import { rng } from "../kit/rng";
import { wires, createWeather, type Weather, type AssetLibrary } from "../kit";
import { SHOPS, SKYSCRAPERS } from "./assets";

export type WorldState = {
  receipt: number; sql: number; schoolGlitch: number;
  hits: { p: THREE.Vector3; t: number }[]; alarm: number; flicker: number; shatter: number;
  beams: { from: THREE.Vector3; to: THREE.Vector3; on: number; rainbow?: boolean; colour: string }[];
  drones: number; dronesFall: number; sparks: { at: number; age: number }[]; vaultOpen: number; confetti: number;
  heroRank: "last" | "one"; screen: number; screenReveal: number; streetSource: number;
};

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.redraw = (d: (g: CanvasRenderingContext2D) => void) => { g.clearRect(0, 0, w, h); d(g); t.needsUpdate = true; }; return t;
};
const neonText = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = "center") => {
  g.font = `800 ${size}px Consolas, monospace`; g.textAlign = align; g.textBaseline = "middle"; g.shadowColor = col; g.shadowBlur = size * 0.4; g.fillStyle = col; g.fillText(s, x, y); g.shadowBlur = 0;
};
const neon = (colour: string) => new THREE.MeshBasicMaterial({ color: colour, toneMapped: false });
const std = (colour: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, ...o });
function boxAt(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function holo(parent: THREE.Object3D, tex: THREE.Texture, w: number, h: number, colour: string, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hologramMaterial(tex, colour)); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
}

export function buildWorld(renderer: THREE.WebGLRenderer, scene: THREE.Scene, lib: AssetLibrary) {
  const root = new THREE.Group(), r = rng(7), atlas = glyphAtlas();
  setFog(30, 230, "#0b1030");
  scene.background = new THREE.Color("#060a1e");

  // neon environment for reflections (wet road, glossy jackets): a little scene of glowing panels
  const envScene = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer);
  for (const [c, x, z] of [["#19e3c4", -6, 0], ["#ff2e88", 6, 0], ["#ffb35c", 0, -6], ["#3a4cff", 0, 6]] as const) { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), neon(c)); p.position.set(x, 1, z); p.lookAt(0, 0, 0); envScene.add(p); }
  scene.environment = pm.fromScene(envScene, 0.04).texture; scene.environmentIntensity = 0.7;

  // ---- ground: wet asphalt everywhere, road markings and pavements on the street ----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), std("#0a0c16", { roughness: 0.22, metalness: 0.55 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const street = new THREE.Group(); root.add(street);
  // rain-wet road and sidewalks: Poly Haven asphalt and concrete (CC0), darkened for night
  const asphalt = lib.pbr("asphalt", { repeat: [STREET.roadHalf * 2 / 6, 260 / 6], color: "#5a5d6a" }); asphalt.roughness = 0.35; asphalt.metalness = 0.3; asphalt.envMapIntensity = 1.6;
  const slabs = lib.pbr("concrete", { repeat: [(STREET.walkHalf - STREET.roadHalf) / 4, 260 / 4], color: "#6a6d7a" }); slabs.roughness = 0.5;
  const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(STREET.roadHalf * 2, 0.04, 260), asphalt); roadMesh.position.set(0, 0.005, -60); roadMesh.receiveShadow = true; street.add(roadMesh);
  for (const s of [-1, 1]) boxAt(street, STREET.walkHalf - STREET.roadHalf, 0.25, 260, s * (STREET.roadHalf + STREET.walkHalf) / 2, 0.12, -60, slabs);
  for (let z = 30; z > -190; z -= 6) boxAt(street, 0.25, 0.03, 2.6, 0, 0.02, z, neon("#ffd166"), false);
  for (const s of [-1, 1]) boxAt(street, 0.12, 0.04, 260, s * (STREET.roadHalf - 0.3), 0.03, -60, neon(s < 0 ? "#19e3c4" : "#ff2e88"), false);

  // ---- buildings along both sides (Kenney City Kit Commercial, CC0): shops near the street, skyscrapers further
  // in; neon edges on top and holo billboards keep the CTF look. Kenney's daytime colours are darkened for night.
  const billboards = ["CTF WORLD FINAL // TONIGHT", "pwn or be pwned", "flag{n0t_th1s_0ne}", "RANKINGS LIVE", "SHELLS 2 FOR 1", "sudo make me a sandwich"];
  const night = new Set<THREE.Material>();
  for (const side of [-1, 1]) for (let z = 26, i = 0; z > -190; i++) {
    const tall = z < -40 || r() < 0.35, name = tall ? SKYSCRAPERS[Math.floor(r() * SKYSCRAPERS.length)] : SHOPS[Math.floor(r() * SHOPS.length)];
    const b = lib.model(name, { scale: tall ? 11 + r() * 3 : 10, shadows: false }), size = b.userData.size as THREE.Vector3;
    const along = size.x, deep = size.z, h = size.y, x = side * (STREET.buildingsAt + deep / 2 + r() * 1.5), zc = z - along / 2;
    b.position.set(x, 0, zc); b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; street.add(b);
    b.traverse((o: any) => { if (o.isMesh && !night.has(o.material)) { night.add(o.material); o.material.color.multiplyScalar(0.45); o.material.envMapIntensity = 0.6; } });
    const edge = [neon("#19e3c4"), neon("#ff2e88"), neon("#ffd166")][(i + (side > 0 ? 1 : 0)) % 3];
    boxAt(street, 0.3, 0.3, along + 0.3, x - side * deep / 2, h, zc, edge, false); boxAt(street, 0.3, h, 0.3, x - side * deep / 2, h / 2, z - 0.1, edge, false);
    if (i % 3 === 1 && z > -150) {
      const label = billboards[(i + (side > 0 ? 3 : 0)) % billboards.length], col = side < 0 ? "#19e3c4" : "#ff2e88";
      const tex = canvasTex(1024, 256, (g) => { g.fillStyle = "rgba(0,0,0,0)"; neonText(g, label, 512, 128, label.length > 18 ? 64 : 92, col); });
      holo(street, tex, 16, 4, col, x - side * (deep / 2 + 0.4), Math.min(h - 5, 12 + r() * 20), zc, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    z -= along + 1.5 + r() * 2.5;
  }
  // street lights (Kenney City Kit Roads) with glows
  for (let z = 22; z > -120; z -= 14) for (const s of [-1, 1]) {
    const l = lib.model("streetLight", { scale: 12, shadows: false }); l.position.set(s * (STREET.roadHalf + 0.8), 0.25, z); l.rotation.y = s < 0 ? -Math.PI / 2 : Math.PI / 2; street.add(l);
    const gl = glow(s < 0 ? "#7fe9ff" : "#ff7ccf", 6, 0.55); gl.position.set(s * (STREET.roadHalf - 0.6), 7, z); street.add(gl);
  }
  // street props (Kenney City Kit Roads: dumpsters, cones, traffic lights, signs), clear of the bakery, the school and
  // the hero's spot; parked cars (Kenney Car Kit) further down; cables overhead
  const props = ["dumpster", "cone", "trafficLight", "signStreet", "barrier"];
  for (let z = 24, k = 0; z > -130; z -= 7 + r() * 5, k++) for (const s of [-1, 1]) {
    if (s > 0 && z < 2 && z > -14) continue; if (s < 0 && z < 6 && z > -34) continue;
    if (r() < 0.35) continue;
    const f = lib.model(props[Math.floor(r() * props.length)], { scale: 10, shadows: false }); f.position.set(s * (STREET.walkHalf - 1.4), 0.25, z); f.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; street.add(f);
  }
  for (let z = -45; z > -130; z -= 26) for (const s of [-1, 1]) { const c = lib.model(["sedan", "taxi", "police", "suv"][Math.floor(r() * 4)], { scale: 3.5 }); c.position.set(s * (STREET.roadHalf - 2.6), 0, z + s * 6); c.rotation.y = s > 0 ? Math.PI : 0; street.add(c); }
  for (let z = 14; z > -150; z -= 18) { const y = 15 + r() * 7; street.add(wires([new THREE.Vector3(-STREET.buildingsAt, y, z), new THREE.Vector3(STREET.buildingsAt, y + (r() - 0.5) * 3, z - 4)], 2.2, "#0a0a0f")); }

  // glyph rain behind the city
  const rain = new THREE.Mesh(new THREE.PlaneGeometry(520, 300), glyphRainMaterial(atlas)); rain.position.set(0, 120, -240); street.add(rain);
  const rainP = new THREE.Mesh(new THREE.PlaneGeometry(520, 300), glyphRainMaterial(atlas, "#ff2e88")); rainP.position.set(PX, 120, -260); root.add(rainP);

  // ---- bakery: storefront, awning, counter with bread, a receipt hologram ----
  const bakery = new THREE.Group(); bakery.position.set(BAKERY.x, 0, BAKERY.z); street.add(bakery);
  boxAt(bakery, 6, 6, 9, 4.2, 3, 0, std("#3a2416", { roughness: 0.8 }));
  boxAt(bakery, 0.2, 3.4, 7.4, 1.1, 2.2, 0, new THREE.MeshStandardMaterial({ color: "#ffcf8a", emissive: new THREE.Color("#ff9e4a"), emissiveIntensity: 0.9 }), false); // lit shop window
  for (let i = 0; i < 9; i++) boxAt(bakery, 1.4, 0.12, 0.85, 0.6, 5.0 - i * 0.0, -4 + i * 0.95 + 0.45, std(i % 2 ? "#f4f1ea" : "#e63946"), false); // striped awning
  boxAt(bakery, 1.1, 1.1, 5.6, -0.4, 0.55, 0, std("#c79a6b", { roughness: 0.5 }));
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), std("#d9a25f", { roughness: 0.7 })); b.rotation.z = Math.PI / 2; b.rotation.y = 0.4 * (i - 2); b.position.set(-0.4, 1.2, -2 + i); bakery.add(b); }
  const signTex = canvasTex(1024, 256, (g) => neonText(g, "B4KERY", 512, 128, 150, "#ffd166"));
  holo(bakery, signTex, 6, 1.5, "#ffd166", 1.0, 6.4, 0, -Math.PI / 2);
  const receiptTex = canvasTex(512, 640, (g) => {
    g.fillStyle = "rgba(10,20,30,0.6)"; g.fillRect(0, 0, 512, 640);
    ["RECEIPT #0x2A", "--------------", "1x sourdough   3.50", "1x croissant   2.10", "--------------", "TOTAL          5.60", "", "flag{fr3sh_br3ad}"].forEach((l, i) => neonText(g, l, 30, 60 + i * 70, 40, l.startsWith("flag") ? "#39ff88" : "#ffffff", "left"));
  });
  const receipt = holo(bakery, receiptTex, 1.5, 1.9, "#39ff88", -1.0, 3.6, 2.0, -Math.PI / 2 + 0.5);

  // ---- school: building, a glitching sign, the SQL hologram ----
  const school = new THREE.Group(); school.position.set(SCHOOL.x, 0, SCHOOL.z); street.add(school);
  boxAt(school, 8, 11, 16, -6, 5.5, 0, std("#24324f", { roughness: 0.7 }));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) boxAt(school, 0.2, 2, 3, -1.9, 3 + j * 4, -5 + i * 5, new THREE.MeshStandardMaterial({ color: "#9fd3ff", emissive: new THREE.Color("#4ab3ff"), emissiveIntensity: 0.7 }), false);
  const schoolTex = canvasTex(1024, 256, (g) => neonText(g, "SCH00L", 512, 128, 150, "#7bff8a"));
  const schoolSign = holo(school, schoolTex, 7, 1.75, "#7bff8a", -1.7, 9.6, 0, Math.PI / 2);
  const sqlTex = canvasTex(1024, 256, (g) => neonText(g, "' OR 1=1--", 512, 128, 140, "#ff2e88"));
  const sql = holo(school, sqlTex, 4.4, 1.1, "#ff2e88", 2.4, 3.4, 0, Math.PI / 2);

  // ---- sky scoreboards (street and plaza) ----
  const boardTex = canvasTex(1024, 640, () => {});
  const drawBoard = (heroRank: "last" | "one") => boardTex.userData.redraw((g: CanvasRenderingContext2D) => {
    g.fillStyle = "rgba(4,8,24,0.55)"; g.fillRect(0, 0, 1024, 640);
    neonText(g, "WORLD CTF SCOREBOARD", 512, 60, 52, "#ffd60a");
    const rows = heroRank === "one" ? [["#1", "you", "1337"], ["#2", "0xDEAD", "1336"], ["#3", "r00tkit", "1200"], ["#4", "nullbyte", "1150"]] : [["#1", "0xDEAD", "1336"], ["#2", "r00tkit", "1200"], ["#3", "nullbyte", "1150"], ["...", "", ""], ["#8,000,000,000", "you", "0"]];
    rows.forEach(([a, b, c], i) => { const col = b === "you" ? (heroRank === "one" ? "#39ff88" : "#ff4d5e") : "#e6f1ff"; neonText(g, a, 60, 150 + i * 100, 44, col, "left"); neonText(g, b, 520, 150 + i * 100, 44, col); neonText(g, c, 960, 150 + i * 100, 44, col, "right"); });
  });
  drawBoard("last"); let boardState = "last";
  holo(street, boardTex, 64, 40, "#ffd60a", 0, 70, -150);

  // ---- plaza: tiles, barriers, searchlights, the Vault and its dome ----
  const plaza = new THREE.Group(); plaza.position.set(PX, 0, 0); root.add(plaza);
  const tileTex = canvasTex(512, 512, (g) => { g.fillStyle = "#0c0f1c"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "#19e3c4"; g.lineWidth = 3; for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); } });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(30, 30);
  const tiles = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: "#ffffff", map: tileTex, emissiveMap: tileTex, emissive: new THREE.Color("#19e3c4"), emissiveIntensity: 0.25, roughness: 0.25, metalness: 0.5 }));
  tiles.rotation.x = -Math.PI / 2; tiles.position.set(0, 0.02, VAULT.z + 10); tiles.receiveShadow = true; plaza.add(tiles);
  const stripe = canvasTex(256, 64, (g) => { for (let i = -64; i < 256; i += 32) { g.fillStyle = "#ffd60a"; g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 16, 64); g.lineTo(i + 48, 0); g.lineTo(i + 32, 0); g.fill(); } });
  stripe.wrapS = THREE.RepeatWrapping; stripe.repeat.set(4, 1);
  for (let x = -26; x <= 26; x += 6.5) { if (Math.abs(x) < 3) continue; boxAt(plaza, 6, 1.1, 0.35, x, 0.8, BARRIER_Z, new THREE.MeshStandardMaterial({ map: stripe, color: "#ffffff", roughness: 0.6 })); boxAt(plaza, 0.2, 0.8, 0.2, x - 2.6, 0.4, BARRIER_Z, std("#333")); boxAt(plaza, 0.2, 0.8, 0.2, x + 2.6, 0.4, BARRIER_Z, std("#333")); }
  const lights: THREE.Mesh[] = [];
  for (const [x, z] of [[-40, -10], [40, -10], [-30, 30], [30, 30]]) { const s = searchlight(); s.position.set(x, 0.5, z); plaza.add(s); lights.push(s); }
  // the Vault: a dark monolith with glowing seams and a two-part door facing +Z
  const vault = new THREE.Group(); vault.position.set(0, 0, VAULT.z); plaza.add(vault);
  boxAt(vault, 12, 70, 12, 0, 35, 0, std("#151824", { roughness: 0.35, metalness: 0.8 }));
  for (const y of [8, 20, 34, 50, 66]) boxAt(vault, 12.2, 0.25, 12.2, 0, y, 0, neon("#19e3c4"), false);
  boxAt(vault, 0.3, 70, 12.2, 6.05, 35, 0, neon("#ff2e88"), false); boxAt(vault, 0.3, 70, 12.2, -6.05, 35, 0, neon("#ff2e88"), false);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(5, 6.4), neon("#fff3c4")); inner.position.set(0, 3.2, 6.02); vault.add(inner);
  const doorL = boxAt(vault, 2.6, 6.6, 0.5, -1.3, 3.3, 6.2, std("#2b3045", { roughness: 0.3, metalness: 0.9 })), doorR = boxAt(vault, 2.6, 6.6, 0.5, 1.3, 3.3, 6.2, std("#2b3045", { roughness: 0.3, metalness: 0.9 }));
  const doorGlow = boxAt(vault, 0.08, 6.6, 0.55, 0, 3.3, 6.2, neon("#19e3c4"), false);
  const flagTex = canvasTex(512, 256, (g) => { g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, 512, 256); neonText(g, "flag{", 256, 90, 70, "#39ff88"); neonText(g, "it_was_in", 256, 160, 54, "#39ff88"); neonText(g, "the_source}", 256, 215, 46, "#39ff88"); });
  const flag = holo(vault, flagTex, 4, 2, "#39ff88", 0, 4, 7); flag.visible = false;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(VAULT.radius, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), domeMaterial("#19e3c4")); dome.position.set(0, 0, VAULT.z); dome.renderOrder = 5; plaza.add(dome);
  const domeGlow = glow("#19e3c4", 70, 0.25); domeGlow.position.set(0, 14, VAULT.z); plaza.add(domeGlow);
  const boardP = holo(plaza, boardTex, 64, 40, "#ffd60a", 0, 62, -100);
  void boardP;
  // the public terminal at the vault door
  const term = new THREE.Group(); term.position.set(TERMINAL.x - PX, 0, TERMINAL.z); plaza.add(term);
  boxAt(term, 1.6, 2.4, 1.0, 0, 1.2, 0, std("#1b1f2c", { roughness: 0.3, metalness: 0.7 }));
  boxAt(term, 1.7, 0.08, 1.1, 0, 2.44, 0.1, std("#2a3044", { metalness: 0.6 }));
  const keys = boxAt(term, 1.3, 0.05, 0.5, 0, 2.5, 0.3, new THREE.MeshStandardMaterial({ color: "#222", emissive: new THREE.Color("#19e3c4"), emissiveIntensity: 0.3 }), false);
  void keys;
  const screenTex = canvasTex(1024, 640, () => {});
  const SRC = ["<html>", "<head>", "  <title>VAULT // login</title>", "</head>", "<body>", "  <form action=\"/auth\">", "    <input name=\"pw\" type=\"password\">", "  </form>", "  <!-- flag{it_was_in_the_source} -->", "</body>", "</html>"];
  const drawScreen = (mode: number, reveal: number) => screenTex.userData.redraw((g: CanvasRenderingContext2D) => {
    g.fillStyle = "#03060c"; g.fillRect(0, 0, 1024, 640);
    if (mode < 1) { neonText(g, "VAULT // LOGIN", 512, 220, 72, "#19e3c4"); g.strokeStyle = "#19e3c4"; g.lineWidth = 4; g.strokeRect(262, 330, 500, 80); neonText(g, "password: ________", 512, 370, 40, "#8fb3c9"); return; }
    neonText(g, "view-source:vault.final", 24, 34, 30, "#8fb3c9", "left");
    SRC.forEach((l, i) => { const hot = l.includes("flag{"); const glowOn = hot && reveal > 0; neonText(g, l, 28, 90 + i * 48, hot && glowOn ? 40 : 34, hot ? (glowOn ? "#39ff88" : "#3d7a52") : l.includes("<") ? "#ff8fc4" : "#c9d1d9", "left"); });
    if (reveal > 0) { g.strokeStyle = `rgba(57,255,136,${Math.min(1, reveal * 2)})`; g.lineWidth = 5; g.strokeRect(14, 90 + 8 * 48 - 28, 996, 56); }
  });
  drawScreen(0, 0); let screenState = "0:0";
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 3.15, -0.1); screen.rotation.x = -0.25; term.add(screen);
  const screenGlow = glow("#19e3c4", 3.5, 0.35); screenGlow.position.set(0, 3.1, 0.2); term.add(screenGlow);

  // ---- drones, beams and bursts ----
  const droneGeo = new THREE.BoxGeometry(0.9, 0.25, 0.9), droneMat = std("#1a1a22", { metalness: 0.7, roughness: 0.3 });
  const drones = Array.from({ length: 22 }, (_, i) => { const d = new THREE.Group(); d.add(new THREE.Mesh(droneGeo, droneMat)); const eye = glow(i % 2 ? "#ff2e88" : "#ff4d5e", 1.8, 0.9); d.add(eye); plaza.add(d); d.visible = false; return d; });
  const beams = Array.from({ length: 5 }, (_, i) => { const b = beam(i === 4 ? "#ffffff" : "#ff2e88", i === 4 ? 0.45 : 0.22); plaza.add(b); b.visible = false; return b; });
  const sparks = Array.from({ length: 6 }, (_, i) => { const s = burst(90, { origin: new THREE.Vector3(), speed: 9, life: 0.7, size: 0.5, colours: ["#ffffff", "#ff2e88", "#ffd60a"], seed: 100 + i, gravity: -14 }); plaza.add(s); return s; });
  const shards = burst(700, { origin: new THREE.Vector3(0, 10, VAULT.z), speed: 18, life: 2.2, size: 0.9, colours: ["#19e3c4", "#7ff5ff", "#ffffff"], seed: 7, gravity: -9, spread: 0.6, up: 6 });
  plaza.add(shards);
  const confetti = burst(500, { origin: new THREE.Vector3(0, 4, VAULT.z + 7), speed: 12, life: 2.6, size: 1.4, colours: ["#39ff88", "#ffd60a", "#ff2e88", "#19e3c4"], seed: 9, gravity: -6, spread: 0.5, up: 8, atlas, birthSpread: 0.4 });
  plaza.add(confetti);

  // ---- light: moon key with soft shadows, a blue/magenta sky fill, neon spill near the action ----
  const hemi = new THREE.HemisphereLight("#4a5cff", "#1a0820", 0.9); root.add(hemi);
  const moon = new THREE.DirectionalLight("#b9c8ff", 1.6); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 }); moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.04;
  root.add(moon, moon.target);
  const spillA = new THREE.PointLight("#19e3c4", 40, 30, 1.6), spillB = new THREE.PointLight("#ff2e88", 40, 30, 1.6); root.add(spillA, spillB);
  // weather: rain and splashes around the camera, a lightning flash light and sky flash
  const weather = createWeather();
  root.add(weather.root);
  const flashLight = new THREE.DirectionalLight("#d6e2ff", 0); root.add(flashLight, flashLight.target);
  const sky = new THREE.Color("#060a1e"), skyFlash = new THREE.Color("#8d9bd6");

  /** env: the shot's weather (from docs/story.md), seconds into the shot, and the camera the rain follows. */
  function update(s: WorldState, time: number, focus: THREE.Vector3, env?: { weather: Weather; local: number; camera: THREE.Camera }) {
    tick(root, time);
    let flash = 0;
    if (env) { flash = weather.update(env.weather, time, env.local, env.camera).flash; }
    flashLight.intensity = flash * 6; flashLight.position.copy(focus).add(new THREE.Vector3(-25, 70, 15)); flashLight.target.position.copy(focus);
    (scene.background as THREE.Color).copy(sky).lerp(skyFlash, flash * 0.6);
    moon.position.set(focus.x + 25, 50, focus.z + 30); moon.target.position.copy(focus);
    spillA.position.set(focus.x - 7, 5, focus.z + 4); spillB.position.set(focus.x + 7, 5, focus.z - 2);
    // street props
    receipt.visible = s.receipt > 0; receipt.scale.setScalar(Math.max(0.001, s.receipt)); (receipt.material as any).uniforms.uGlitch.value = 1 - s.receipt;
    sql.visible = s.sql > 0; sql.scale.setScalar(Math.max(0.001, s.sql)); (schoolSign.material as any).uniforms.uGlitch.value = s.schoolGlitch;
    const bs = s.heroRank; if (bs !== boardState) { boardState = bs; drawBoard(bs); }
    // dome
    const du = (dome.material as THREE.ShaderMaterial).uniforms;
    s.hits.slice(-8).forEach((h, i) => du.uHit.value[i].set(h.p.x - PX, h.p.y, h.p.z, h.t));
    for (let i = s.hits.length; i < 8; i++) du.uHit.value[i].w = -99;
    du.uAlarm.value = s.alarm; du.uFlicker.value = s.flicker; du.uShatter.value = s.shatter; dome.visible = s.shatter < 0.999; domeGlow.material.opacity = 0.25 * (1 - s.shatter);
    lights.forEach((l, i) => { l.rotation.set(0.5 + 0.25 * Math.sin(time * 0.5 + i), 0, 0); l.rotation.y = time * 0.3 + i * 1.6; l.rotation.order = "YXZ"; });
    // drones circle, dive at the dome, then drop
    drones.forEach((d, i) => {
      d.visible = s.drones > 0;
      if (!d.visible) return;
      const a = (i / drones.length) * Math.PI * 2 + time * 0.6, rad = 38 - 12 * s.drones, y = 26 + 6 * Math.sin(time * 2 + i) - 10 * s.drones;
      const fall = s.dronesFall, fy = Math.max(0.3, y - fall * fall * 40);
      d.position.set(Math.cos(a) * rad, fy, VAULT.z + Math.sin(a) * rad * 0.7 + 8); d.rotation.set(fall * 2 * (i % 3), a, fall * (i % 2 ? 1 : -1));
    });
    beams.forEach((b, i) => { const sp = s.beams[i]; b.visible = !!sp && sp.on > 0; if (!sp) return; b.userData.aim(sp.from.clone().sub(plaza.position), sp.to.clone().sub(plaza.position)); const u = (b.material as THREE.ShaderMaterial).uniforms; u.uOn.value = sp.on; u.uRainbow.value = sp.rainbow ? 1 : 0; u.uColor.value.set(sp.colour); });
    sparks.forEach((sp, i) => { const e = s.sparks[i]; if (!e) { sp.userData.at(-1); return; } const h = s.hits[Math.min(s.hits.length - 1, e.at)]; if (h) sp.position.set(h.p.x - PX, h.p.y, h.p.z); sp.userData.at(e.age); });
    shards.userData.at(s.shatter > 0 ? s.shatter * 2.2 : -1);
    confetti.userData.at(s.confetti);
    // vault door, flag, terminal screen
    doorL.position.x = -1.3 - s.vaultOpen * 2.6; doorR.position.x = 1.3 + s.vaultOpen * 2.6; doorGlow.visible = s.vaultOpen < 0.05;
    flag.visible = s.vaultOpen > 0.2; flag.position.y = 4 + s.vaultOpen * 3; flag.scale.setScalar(0.4 + s.vaultOpen);
    const key = `${s.screen}:${s.screenReveal > 0 ? 1 : 0}`; if (key !== screenState) { screenState = key; drawScreen(s.screen, s.screenReveal); }
  }
  return { root, update, screenTex };
}

