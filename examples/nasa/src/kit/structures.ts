// Structures and props built in code, textured at real scale (UVs in studs): a suburban street of houses with
// lawns, fences, trees, road, sidewalks, lamps, cars and power lines, and interiors (bedroom, living room) with
// a bed, lamps, desk, sofa, TV, shelves and a rug. Everything is original and deterministic from a seed.
// Sizes follow Roblox scale: a character is ~5 studs tall, a door ~7, a storey ~10.
import * as THREE from "three";
import { rng } from "blockrig/video";
import { material, roadMarkings, windowTexture, TEXTURES, type TexOpts } from "./textures";

// ---- geometry with UVs in studs, so one material (repeat 1/studs) fits faces of any size ----
function studUV(g: THREE.BufferGeometry) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
export const box = (w: number, h: number, d: number) => studUV(new THREE.BoxGeometry(w, h, d));
export const cyl = (rt: number, rb: number, h: number, seg = 12) => studUV(new THREE.CylinderGeometry(rt, rb, h, seg));

/** Shared materials keyed by texture + options, with UVs in studs. Keeps the list of wet-able ground materials. */
export class Materials {
  private cache = new Map<string, THREE.MeshStandardMaterial>();
  readonly ground: { mat: THREE.MeshStandardMaterial; dry: { roughness: number; color: THREE.Color } }[] = [];
  readonly windows: THREE.MeshStandardMaterial[] = [];
  readonly lamps: THREE.MeshStandardMaterial[] = [];
  surface(name: string, o: TexOpts & { emissive?: string; emissiveIntensity?: number } = {}, wet = false) {
    const key = JSON.stringify([name, o]);
    let m = this.cache.get(key);
    if (!m) {
      m = material(name, { ...o, size: [TEXTURES[name].studs, TEXTURES[name].studs] });
      m.map!.repeat.set(1 / TEXTURES[name].studs, 1 / TEXTURES[name].studs);
      if (m.bumpMap) m.bumpMap = m.map;
      this.cache.set(key, m);
      if (wet) this.ground.push({ mat: m, dry: { roughness: m.roughness, color: m.color.clone() } });
    }
    return m;
  }
  plain(color: string, o: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number } = {}) {
    const key = JSON.stringify(["plain", color, o]);
    let m = this.cache.get(key);
    if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: o.roughness ?? 0.8, metalness: o.metalness ?? 0 }); if (o.emissive) { m.emissive.set(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; } this.cache.set(key, m); }
    return m;
  }
  window(seed: number) { const m = new THREE.MeshStandardMaterial({ map: windowTexture(false, seed), emissiveMap: windowTexture(true, seed), emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0, roughness: 0.2 }); this.windows.push(m); return m; }
  /** 0 = day (windows dark, lamps off) .. 1 = night (most windows lit, lamps on). */
  setNight(k: number) { this.windows.forEach((m, i) => { m.emissiveIntensity = ((i * 7919) % 10) / 10 < 0.75 ? k * 1.1 : 0; }); this.lamps.forEach((m) => { m.emissiveIntensity = 0.2 + k * 3; }); }
}

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, cast = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o; };
const group = (...c: THREE.Object3D[]) => { const g = new THREE.Group(); c.forEach((o) => g.add(o)); return g; };

// ---------------------------------------------------------------- exterior props
export function tree(M: Materials, seed = 1, height = 9) {
  const r = rng(seed), g = new THREE.Group();
  g.add(mesh(cyl(0.45, 0.6, height * 0.5, 8), M.surface("bark"), 0, height * 0.25, 0));
  const leaf = M.surface("leaves", { base: ["#3f7a34", "#4c8a3a", "#2f6a2c", "#5c9443"][Math.floor(r() * 4)] });
  for (let i = 0; i < 4; i++) { const s = (3.6 - i * 0.6) * (0.9 + r() * 0.2); g.add(mesh(box(s, s * 0.75, s), leaf, (r() - 0.5) * 0.8, height * 0.48 + i * s * 0.55, (r() - 0.5) * 0.8)); }
  g.rotation.y = r() * Math.PI;
  return g;
}
export const bush = (M: Materials, seed = 1) => { const r = rng(seed); return mesh(box(2 + r(), 1.4 + r() * 0.6, 1.6 + r()), M.surface("leaves", { base: "#3b6e31" }), 0, 0.75, 0); };
export function fence(M: Materials, length: number, colour = "#f4f1ea") {
  const g = new THREE.Group(), m = M.surface("wood", { base: colour });
  g.add(mesh(box(length, 0.3, 0.15), m, 0, 2.2, 0), mesh(box(length, 0.3, 0.15), m, 0, 1.1, 0));
  for (let x = -length / 2 + 0.3; x <= length / 2; x += 0.9) g.add(mesh(box(0.35, 2.8, 0.18), m, x, 1.4, 0.05));
  return g;
}
export function lampPost(M: Materials, height = 11) {
  const metal = M.plain("#2e3238", { roughness: 0.5, metalness: 0.6 }), bulb = M.plain("#fff2c4", { emissive: "#ffd98a", emissiveIntensity: 0.2 }); M.lamps.push(bulb);
  return group(mesh(cyl(0.18, 0.26, height, 8), metal, 0, height / 2, 0), mesh(box(1.8, 0.2, 0.3), metal, 0.8, height, 0), mesh(box(0.9, 0.35, 0.7), metal, 1.5, height - 0.15, 0), mesh(box(0.7, 0.12, 0.5), bulb, 1.5, height - 0.38, 0, false));
}
export function mailbox(M: Materials, colour = "#2f5d95") { return group(mesh(box(0.2, 3, 0.2), M.surface("wood"), 0, 1.5, 0), mesh(box(0.8, 0.7, 1.3), M.plain(colour, { roughness: 0.4, metalness: 0.4 }), 0, 3.2, 0)); }
export function car(M: Materials, colour = "#c8352f", seed = 1) {
  const body = M.plain(colour, { roughness: 0.3, metalness: 0.5 }), glass = M.plain("#26313d", { roughness: 0.1, metalness: 0.3 }), tyre = M.plain("#151515", { roughness: 0.9 }), light = M.plain("#fff6d8", { emissive: "#fff2c0", emissiveIntensity: 0.6 });
  const g = group(mesh(box(4.4, 1.4, 9), body, 0, 1.4, 0), mesh(box(3.9, 1.3, 4.6), glass, 0, 2.7, -0.4), mesh(box(3.95, 0.2, 4.7), body, 0, 3.4, -0.4));
  for (const [x, z] of [[-2.1, 2.9], [2.1, 2.9], [-2.1, -2.9], [2.1, -2.9]]) { const w = mesh(cyl(0.9, 0.9, 0.6, 14), tyre, x, 0.9, z); w.rotation.z = Math.PI / 2; g.add(w); }
  g.add(mesh(box(1, 0.4, 0.1), light, -1.4, 1.6, 4.5, false), mesh(box(1, 0.4, 0.1), light, 1.4, 1.6, 4.5, false));
  g.rotation.y = rng(seed)() < 0.5 ? 0 : Math.PI;
  return g;
}
export function bench(M: Materials) { const w = M.surface("wood", { base: "#8a5a32" }), metal = M.plain("#2b2b2b", { metalness: 0.6, roughness: 0.5 }); return group(mesh(box(5, 0.25, 1.4), w, 0, 1.6, 0), mesh(box(5, 1.2, 0.2), w, 0, 2.5, -0.65), mesh(box(0.2, 1.6, 1.4), metal, -2.2, 0.8, 0), mesh(box(0.2, 1.6, 1.4), metal, 2.2, 0.8, 0)); }
export function hydrant(M: Materials) { const m = M.plain("#c8302a", { roughness: 0.45, metalness: 0.3 }); return group(mesh(cyl(0.45, 0.5, 1.8), m, 0, 0.9, 0), mesh(cyl(0.3, 0.45, 0.4), m, 0, 2, 0), mesh(box(1.3, 0.3, 0.3), m, 0, 1.3, 0)); }
export function trashBin(M: Materials, colour = "#2f6b3a") { return group(mesh(cyl(0.9, 0.8, 2.6, 12), M.plain(colour, { roughness: 0.6 }), 0, 1.3, 0), mesh(cyl(1, 1, 0.25, 12), M.plain(colour, { roughness: 0.5 }), 0, 2.7, 0)); }
/** Power pole with a cross arm; join poles with wires(). */
export function powerPole(M: Materials, height = 18) { const w = M.surface("wood", { base: "#5d4632" }); return group(mesh(cyl(0.3, 0.38, height, 8), w, 0, height / 2, 0), mesh(box(4, 0.3, 0.3), w, 0, height - 1.2, 0)); }
export function wires(points: THREE.Vector3[], sag = 1.2, colour = "#151515") {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: colour });
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1], mid = a.clone().lerp(b, 0.5); mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.05, 4), m));
  }
  return g;
}

// ---------------------------------------------------------------- houses
export type HouseOpts = { w?: number; d?: number; floors?: 1 | 2; wall?: string; wallTex?: "siding" | "brick" | "plaster"; roof?: string; trim?: string; door?: string; seed?: number; garage?: boolean };
/** A suburban house with few windows, as in Roblox story shorts. Its front faces +Z; the door is at (0, 0, d/2). */
export function house(M: Materials, o: HouseOpts = {}) {
  const r = rng(o.seed ?? 1), w = o.w ?? 18, d = o.d ?? 14, floors = o.floors ?? (r() < 0.5 ? 1 : 2), H = 10 * floors;
  const wall = M.surface(o.wallTex ?? "siding", { base: o.wall ?? "#d9d2c3" }), trim = M.plain(o.trim ?? "#f7f5f0", { roughness: 0.6 });
  const g = new THREE.Group(); g.name = "House";
  g.add(mesh(box(w, H, d), wall, 0, H / 2, 0));
  g.add(mesh(box(w + 0.6, 0.6, d + 0.6), M.surface("plaster", { base: "#9b958c" }), 0, 0.3, 0)); // foundation
  // gable roof: a triangular prism along X, with overhang
  const rh = 6 + r() * 2, shape = new THREE.Shape([new THREE.Vector2(-d / 2 - 1, 0), new THREE.Vector2(d / 2 + 1, 0), new THREE.Vector2(0, rh)]);
  const roofG = new THREE.ExtrudeGeometry(shape, { depth: w + 1.6, bevelEnabled: false }); roofG.translate(0, 0, -(w + 1.6) / 2); roofG.rotateY(Math.PI / 2); roofG.computeVertexNormals(); studUV(roofG);
  g.add(mesh(roofG, M.surface("shingles", { base: o.roof ?? "#5b4a48" }), 0, H, 0));
  // chimney, door, porch, windows
  g.add(mesh(box(1.6, 5, 1.6), M.surface("brick"), w * 0.28, H + rh * 0.6, -d * 0.15));
  g.add(mesh(box(4, 7.2, 0.3), M.surface("wood", { base: o.door ?? "#7b3f2a" }), 0, 3.6 + 0.6, d / 2 + 0.05));
  g.add(mesh(box(0.25, 0.25, 0.3), M.plain("#d8b25a", { metalness: 0.8, roughness: 0.3 }), 1.4, 4, d / 2 + 0.25));
  g.add(mesh(box(6, 0.8, 3), M.surface("plaster", { base: "#b9b3a8" }), 0, 0.4, d / 2 + 1.5));
  g.add(mesh(box(6.4, 0.4, 3.4), trim, 0, 8.6, d / 2 + 1.6), mesh(box(0.4, 8, 0.4), trim, -2.8, 4.4, d / 2 + 3), mesh(box(0.4, 8, 0.4), trim, 2.8, 4.4, d / 2 + 3));
  const win = (x: number, y: number, z: number, ry: number) => { const f = group(mesh(box(4.4, 4.4, 0.3), trim, 0, 0, 0), mesh(new THREE.PlaneGeometry(3.8, 3.8), M.window(Math.floor(r() * 1000)), 0, 0, 0.17, false), mesh(box(5, 0.35, 0.8), trim, 0, -2.3, 0.3)); f.position.set(x, y, z); f.rotation.y = ry; return f; };
  for (let f = 0; f < floors; f++) {
    const y = 5.5 + f * 10, xs = f === 0 ? [-w * 0.3, w * 0.3] : [-w * 0.25, 0, w * 0.25].filter(() => r() < 0.8);
    for (const x of xs) g.add(win(x, y, d / 2 + 0.1, 0));
    if (r() < 0.6) g.add(win(w / 2 + 0.1, y, 0, Math.PI / 2));
  }
  if (o.garage) { const gw = 11; g.add(mesh(box(gw, 9, d * 0.9), wall, w / 2 + gw / 2, 4.5, -d * 0.05), mesh(box(gw - 2, 7, 0.3), M.plain("#e8e4dc", { roughness: 0.6 }), w / 2 + gw / 2, 3.7, d * 0.4 + 0.05)); }
  return g;
}

// ---------------------------------------------------------------- street
export type Town = { root: THREE.Group; M: Materials; houses: { door: THREE.Vector3; facing: number; object: THREE.Group }[]; roadHalf: number; sidewalkHalf: number; length: number };
/**
 * A suburban street along Z, centred on the origin: road, curbs, sidewalks, lawns, a row of houses on each side
 * set back behind lawns, fences, trees, mailboxes, lamps, parked cars and power lines.
 */
export function suburbanStreet({ length = 220, perSide = 6, seed = 3, M = new Materials() } = {}): Town {
  const r = rng(seed), root = new THREE.Group(); root.name = "Street";
  const roadHalf = 9, walk = 6, lawn = 18, sidewalkHalf = roadHalf + walk;
  // ground layers
  const road = mesh(box(roadHalf * 2, 0.2, length), M.surface("asphalt", {}, true), 0, -0.1, 0, false); root.add(road);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(roadHalf * 2, length), new THREE.MeshStandardMaterial({ map: roadMarkings(), transparent: true, roughness: 0.6, depthWrite: false }));
  mark.material.map!.wrapT = THREE.RepeatWrapping; mark.material.map!.repeat.set(1, length / 24); mark.rotation.x = -Math.PI / 2; mark.position.y = 0.02; mark.receiveShadow = true; root.add(mark);
  for (const s of [-1, 1]) {
    root.add(mesh(box(0.6, 0.5, length), M.surface("plaster", { base: "#bdb8ae" }), s * (roadHalf + 0.3), 0.25, 0, false));
    root.add(mesh(box(walk, 0.4, length), M.surface("sidewalk", {}, true), s * (roadHalf + walk / 2), 0.2, 0, false));
    root.add(mesh(box(lawn * 3, 0.3, length), M.surface("grass", {}, true), s * (sidewalkHalf + lawn * 1.5), 0.15, 0, false));
  }
  // houses, lots, props
  const houses: Town["houses"] = [];
  const walls = ["#d9d2c3", "#c9d6df", "#e8d8b0", "#d8c2c2", "#c7d3b8", "#efe9df"], roofs = ["#5b4a48", "#3e4a57", "#6b3b2e", "#4a4a4a"], doors = ["#7b3f2a", "#2f5d95", "#2f6b3a", "#9b2c2c"];
  const spacing = length / perSide;
  for (const s of [-1, 1]) for (let i = 0; i < perSide; i++) {
    const z = -length / 2 + spacing * (i + 0.5) + (r() - 0.5) * 4, x = s * (sidewalkHalf + lawn + 7);
    const h = house(M, { seed: Math.floor(r() * 1e6), wall: walls[Math.floor(r() * walls.length)], roof: roofs[Math.floor(r() * roofs.length)], door: doors[Math.floor(r() * doors.length)], wallTex: r() < 0.25 ? "brick" : "siding", garage: r() < 0.35 });
    h.position.set(x, 0.3, z); h.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; root.add(h);
    const door = new THREE.Vector3(0, 0, 7 + 3.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), h.rotation.y).add(h.position);
    houses.push({ door, facing: h.rotation.y, object: h });
    // front path, fence with a gap, mailbox, trees and bushes
    const path = mesh(box(lawn - 2, 0.12, 3), M.surface("sidewalk", { base: "#bab6ad" }, true), s * (sidewalkHalf + lawn / 2), 0.36, z, false); root.add(path);
    for (const dz of [-1, 1]) { const f = fence(M, spacing / 2 - 3.5); f.position.set(s * (sidewalkHalf + 0.8), 0.3, z + dz * (spacing / 4 + 1.75)); f.rotation.y = Math.PI / 2; root.add(f); }
    const mb = mailbox(M); mb.position.set(s * (sidewalkHalf + 1.6), 0.3, z + 2.8); root.add(mb);
    if (r() < 0.8) { const t = tree(M, Math.floor(r() * 1e6), 9 + r() * 4); t.position.set(s * (sidewalkHalf + 5 + r() * 6), 0.3, z + (r() < 0.5 ? -1 : 1) * (6 + r() * 5)); root.add(t); }
    for (let b = 0; b < 2; b++) { const bu = bush(M, Math.floor(r() * 1e6)); bu.position.set(x - s * 9.6, 0.3, z + (b ? 5 : -5)); root.add(bu); }
    if (r() < 0.35) { const c = car(M, ["#c8352f", "#2f5d95", "#e8e4dc", "#2b2b2b", "#d9a62e"][Math.floor(r() * 5)], Math.floor(r() * 1e6)); c.position.set(s * (roadHalf - 3), 0, z + 8); root.add(c); }
  }
  // street lamps and power lines down one side
  const poles: THREE.Vector3[] = [];
  for (let z = -length / 2 + 15; z < length / 2; z += 36) {
    for (const s of [-1, 1]) { const l = lampPost(M); l.position.set(s * (roadHalf + 1.2), 0.4, z + (s > 0 ? 18 : 0)); l.rotation.y = s > 0 ? Math.PI : 0; root.add(l); }
    const p = powerPole(M); p.position.set(-(sidewalkHalf + 2), 0, z + 9); root.add(p);
    poles.push(new THREE.Vector3(-(sidewalkHalf + 2) - 1.6, 16.8, z + 9), new THREE.Vector3(-(sidewalkHalf + 2) + 1.6, 16.8, z + 9));
  }
  const left = poles.filter((_, i) => i % 2 === 0), right = poles.filter((_, i) => i % 2 === 1);
  root.add(wires(left), wires(right));
  const h1 = hydrant(M); h1.position.set(roadHalf + 2, 0.4, -20); root.add(h1);
  const tb = trashBin(M); tb.position.set(-(roadHalf + 2), 0.4, 26); root.add(tb);
  return { root, M, houses, roadHalf, sidewalkHalf, length };
}

// ---------------------------------------------------------------- interiors
export function bed(M: Materials, { blanket = "#4f7cc2", accent = "#f1c453", wood = "#8a5a32" } = {}) {
  const w = M.surface("wood", { base: wood });
  return group(
    mesh(box(5.2, 1.4, 8.4), w, 0, 0.7, 0), mesh(box(5.2, 3.6, 0.4), w, 0, 1.8, -4.2), mesh(box(5.2, 2.2, 0.4), w, 0, 1.1, 4.2),
    mesh(box(4.9, 0.9, 8), M.surface("fabric", { base: "#f2efe9" }), 0, 1.85, 0),
    mesh(box(5, 0.35, 5.6), M.surface("fabric", { base: blanket, accent }), 0, 2.45, 1.2),
    mesh(box(3.4, 0.6, 1.4), M.surface("fabric", { base: "#ffffff" }), 0, 2.6, -3.1),
  );
}
/** A table lamp; `on` lights the shade. Returns the lamp and its light (add it to the scene to light the room). */
export function tableLamp(M: Materials, on = true) {
  const shade = new THREE.MeshStandardMaterial({ map: (M.surface("lampshade") as THREE.MeshStandardMaterial).map, emissive: new THREE.Color("#ffcf7a"), emissiveIntensity: on ? 1.2 : 0, roughness: 0.9, side: THREE.DoubleSide });
  M.lamps.push(shade);
  const g = group(mesh(cyl(0.5, 0.6, 0.25, 16), M.surface("metal", { base: "#c9a45c" }), 0, 0.12, 0), mesh(cyl(0.08, 0.08, 1.6, 8), M.surface("metal", { base: "#c9a45c" }), 0, 0.9, 0), mesh(new THREE.CylinderGeometry(0.6, 0.95, 1.1, 20, 1, true), shade, 0, 1.9, 0, false));
  const light = new THREE.PointLight("#ffcf8a", on ? 8 : 0, 18, 1.6); light.position.set(0, 1.8, 0); g.add(light);
  return g;
}
export function floorLamp(M: Materials, on = true) { const l = tableLamp(M, on); l.children[1].scale.y = 3.6; l.children[1].position.y = 2.95; l.children[2].position.y = 6; (l.children[3] as THREE.PointLight).position.y = 5.9; return l; }
export function desk(M: Materials) { const w = M.surface("wood", { base: "#a77b4f" }); const g = group(mesh(box(6, 0.3, 3), w, 0, 3, 0)); for (const [x, z] of [[-2.8, -1.3], [2.8, -1.3], [-2.8, 1.3], [2.8, 1.3]]) g.add(mesh(box(0.3, 3, 0.3), w, x, 1.5, z)); g.add(mesh(box(2, 1.3, 0.12), M.plain("#111318", { roughness: 0.3 }), 0, 4.1, -0.8), mesh(box(1.9, 1.1, 0.02), M.plain("#2a6fd6", { emissive: "#3a7fe6", emissiveIntensity: 0.8 }), 0, 4.12, -0.73, false)); return g; }
export function chair(M: Materials, colour = "#3b3b45") { const f = M.surface("fabric", { base: colour }); return group(mesh(box(2.2, 0.4, 2.2), f, 0, 2, 0), mesh(box(2.2, 2.6, 0.3), f, 0, 3.4, -1), mesh(cyl(0.12, 0.12, 2, 6), M.plain("#222"), 0, 1, 0)); }
export function sofa(M: Materials, colour = "#8c4a3a") { const f = M.surface("fabric", { base: colour }); return group(mesh(box(8, 1.4, 3.4), f, 0, 1.2, 0), mesh(box(8, 2.6, 0.9), f, 0, 2.3, -1.3), mesh(box(0.9, 2, 3.4), f, -4.1, 1.6, 0), mesh(box(0.9, 2, 3.4), f, 4.1, 1.6, 0), mesh(box(3.5, 0.6, 2.6), M.surface("fabric", { base: colour, accent: "#f3e3c3" }), -1.8, 2.15, 0.2), mesh(box(3.5, 0.6, 2.6), M.surface("fabric", { base: colour, accent: "#f3e3c3" }), 1.8, 2.15, 0.2)); }
export function tv(M: Materials, on = true) { return group(mesh(box(6, 3.6, 0.3), M.plain("#0c0d10", { roughness: 0.3 }), 0, 4.4, 0), mesh(box(5.6, 3.2, 0.02), M.plain(on ? "#4fb3ff" : "#101215", on ? { emissive: "#4fb3ff", emissiveIntensity: 0.9 } : {}), 0, 4.4, 0.17, false), mesh(box(7, 1.8, 1.8), M.surface("wood", { base: "#5a4030" }), 0, 0.9, 0)); }
export function shelf(M: Materials, seed = 1) {
  const r = rng(seed), w = M.surface("wood", { base: "#8a6a48" }), g = group(mesh(box(5, 7, 0.3), w, 0, 3.5, -0.7));
  for (let k = 0; k < 4; k++) { g.add(mesh(box(5, 0.25, 1.6), w, 0, 0.2 + k * 2.2, 0)); if (k < 3) for (let x = -2.2; x < 2.2;) { const bw = 0.25 + r() * 0.3, bh = 1.2 + r() * 0.7; g.add(mesh(box(bw, bh, 1.1), M.plain(["#9b2c2c", "#2f5d95", "#2f6b3a", "#d9a62e", "#5b3a7a", "#e8e4dc"][Math.floor(r() * 6)], { roughness: 0.7 }), x + bw / 2, 0.35 + k * 2.2 + bh / 2, 0.1)); x += bw + 0.04; } }
  return g;
}
export const rug = (M: Materials, w = 8, d = 6, colour = "#a8504a") => mesh(box(w, 0.06, d), M.surface("carpet", { base: colour }), 0, 0.03, 0, false);

export type Room = { root: THREE.Group; M: Materials; w: number; d: number; h: number };
/** A room with floor, walls (one with a window), skirting and ceiling; the open side faces +Z for the camera. */
export function room(M: Materials, { w = 24, d = 20, h = 12, wall = "#e8e0d2", floor = "wood" as "wood" | "carpet" | "tile", floorColour = "#a77b4f", seed = 2, openFront = true } = {}): Room {
  const root = new THREE.Group(); root.name = "Room";
  const wm = M.surface("plaster", { base: wall }), fm = M.surface(floor, { base: floorColour });
  root.add(mesh(box(w, 0.4, d), fm, 0, -0.2, 0, false));
  root.add(mesh(box(w, h, 0.4), wm, 0, h / 2, -d / 2), mesh(box(0.4, h, d), wm, -w / 2, h / 2, 0), mesh(box(0.4, h, d), wm, w / 2, h / 2, 0));
  if (!openFront) root.add(mesh(box(w, h, 0.4), wm, 0, h / 2, d / 2));
  root.add(mesh(box(w, 0.4, d), M.surface("plaster", { base: "#f4f1ea" }), 0, h, 0, false));
  const trim = M.plain("#f7f5f0"); root.add(mesh(box(w, 0.6, 0.15), trim, 0, 0.3, -d / 2 + 0.25), mesh(box(0.15, 0.6, d), trim, -w / 2 + 0.25, 0.3, 0));
  const win = group(mesh(box(6, 6, 0.3), trim), mesh(new THREE.PlaneGeometry(5.4, 5.4), M.window(seed), 0, 0, 0.17, false)); win.position.set(w * 0.2, h * 0.55, -d / 2 + 0.25); root.add(win);
  return { root, M, w, d, h };
}

// ---------------------------------------------------------------- city details
// Dress a plain tower (any box building) so it reads as architecture: ledges, rooftop clutter, a fire escape and a
// shopfront. `front` is the side facing the street: +1 = +X, -1 = -X. Returns a group positioned like the tower.
export function vendingMachine(M: Materials, glow = "#4fd1ff") {
  return group(mesh(box(2.2, 4.6, 1.6), M.plain("#c8302a", { roughness: 0.4, metalness: 0.3 }), 0, 2.3, 0),
    mesh(box(1.6, 3.2, 0.05), M.plain("#dff6ff", { emissive: glow, emissiveIntensity: 1.4 }), -0.15, 2.7, 0.81, false),
    mesh(box(0.4, 1.2, 0.05), M.plain("#222", { roughness: 0.3 }), 0.8, 2.2, 0.81, false));
}
export function acUnit(M: Materials) { return group(mesh(box(2, 1.4, 1.4), M.surface("metal", { base: "#9aa1a8" }), 0, 0.7, 0), mesh(cyl(0.55, 0.55, 0.06, 16), M.plain("#2b2b2b"), 0, 1.43, 0, false)); }
export function waterTank(M: Materials) {
  const w = M.surface("wood", { base: "#6b4a32" }), metal = M.plain("#2b2e35", { metalness: 0.6, roughness: 0.5 });
  const g = group(mesh(cyl(1.8, 1.8, 3.4, 16), w, 0, 4.7, 0), mesh(new THREE.ConeGeometry(2, 1.2, 16), M.surface("metal", { base: "#55606b" }), 0, 7, 0));
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) g.add(mesh(box(0.25, 3, 0.25), metal, x, 1.5, z));
  return g;
}
/** An antenna with a light that blinks (call setNight; the blink is driven by uTime-free emissive: use `blink(t)`). */
export function antenna(M: Materials, h = 8) { const red = M.plain("#ff3b3b", { emissive: "#ff2a2a", emissiveIntensity: 2 }); M.lamps.push(red); return group(mesh(cyl(0.12, 0.18, h, 6), M.plain("#3a3f48", { metalness: 0.7, roughness: 0.4 }), 0, h / 2, 0), mesh(box(0.4, 0.4, 0.4), red, 0, h, 0, false)); }
export function fireEscape(M: Materials, floors: number, width = 7, storey = 4) {
  const metal = M.plain("#24272e", { metalness: 0.6, roughness: 0.5 }), g = new THREE.Group();
  for (let f = 1; f <= floors; f++) {
    const y = f * storey;
    g.add(mesh(box(width, 0.15, 1.6), metal, 0, y, 0.8), mesh(box(width, 0.08, 0.08), metal, 0, y + 1.1, 1.6), mesh(box(0.08, 1.1, 0.08), metal, -width / 2, y + 0.55, 1.6), mesh(box(0.08, 1.1, 0.08), metal, width / 2, y + 0.55, 1.6));
    const ladder = mesh(box(0.9, Math.hypot(storey, 1.2), 0.1), metal, (f % 2 ? 1 : -1) * width * 0.3, y - storey / 2, 0.9); ladder.rotation.z = (f % 2 ? 1 : -1) * 0.3; g.add(ladder);
  }
  return g;
}
export function awning(M: Materials, width = 6, a = "#e63946", b = "#f4f1ea") {
  const g = new THREE.Group();
  for (let i = 0; i < Math.round(width / 0.8); i++) { const s = mesh(box(0.8, 0.1, 2), M.plain(i % 2 ? b : a, { roughness: 0.7 }), -width / 2 + 0.4 + i * 0.8, 0, 1); s.rotation.x = 0.35; g.add(s); }
  return g;
}
/**
 * Architectural dressing for a box tower of size w×h×d centred at (x, z) on the ground: ledges every 3 storeys,
 * a parapet, rooftop water tank / AC units / antenna, a fire escape and a shopfront awning on the street side.
 */
export function dressTower(M: Materials, o: { x: number; z: number; w: number; h: number; d: number; front: 1 | -1; seed?: number; trim?: string }) {
  const r = rng(o.seed ?? 1), g = new THREE.Group(); g.position.set(o.x, 0, o.z);
  const trim = M.surface("plaster", { base: o.trim ?? "#2a2f3d" }), storey = 4;
  for (let y = storey * 3; y < o.h - 2; y += storey * 3) g.add(mesh(box(o.w + 0.5, 0.35, o.d + 0.5), trim, 0, y, 0));
  g.add(mesh(box(o.w + 0.3, 1, o.d + 0.3), trim, 0, o.h + 0.5, 0));
  const roof = new THREE.Group(); roof.position.y = o.h; g.add(roof);
  if (r() < 0.6) { const t = waterTank(M); t.position.set((r() - 0.5) * o.w * 0.4, 0, (r() - 0.5) * o.d * 0.4); roof.add(t); }
  for (let i = 0; i < 1 + Math.floor(r() * 3); i++) { const a = acUnit(M); a.position.set((r() - 0.5) * (o.w - 2), 0, (r() - 0.5) * (o.d - 2)); roof.add(a); }
  if (r() < 0.5) { const an = antenna(M, 5 + r() * 6); an.position.set(o.w * 0.3, 0, -o.d * 0.3); roof.add(an); }
  // street side: fire escape on the lower floors and an awning over the shop
  const face = new THREE.Group(); face.position.x = o.front * (o.w / 2); face.rotation.y = o.front > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(face);
  if (r() < 0.7) { const fe = fireEscape(M, Math.min(5, Math.floor(o.h / storey) - 2), Math.min(7, o.d * 0.6), storey); fe.position.set((r() - 0.5) * o.d * 0.2, 0, 0); face.add(fe); }
  const aw = awning(M, Math.min(7, o.d * 0.7), ["#e63946", "#2a9d8f", "#3a86ff", "#f4a261"][Math.floor(r() * 4)]); aw.position.set(0, 3.6, 0); face.add(aw);
  return g;
}
