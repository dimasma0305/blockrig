// The four locations (docs/visuals.md "Locations"), far apart so two never share a frame:
//   village  - a cobbled square with the King's golden statue in a fountain, Roblox Toolbox medieval houses facing it,
//              market stalls and lanterns, the school, a swing, a planting field, and sawit (oil palm) to the horizon
//   forest   - Grandpa's forest (Kenney nature trees on leaf litter) with his stump at the edge, sawit rows on bare
//              soil beyond it, and a second "victim" forest that burns in s03 and is sawit in s04
//   palace   - the Roblox Toolbox castle at the end of a dirt road
//   room     - the King's secret room behind his portrait: the map, the ledger, the gold, the oil barrels
// Big repeated things (palms, trees, coins) are instanced from the downloaded models. Fire is src/world/fire.ts.
import * as THREE from "three";
import { createLighting, createWeather, applyFog, rng, LOOK, buildRobloxMap, layer, checkGround, type AssetLibrary, type Weather, type Daylight } from "../kit";
import { Plan, rect } from "../kit/plan";
import type { RobloxCast } from "../cast/roblox";
import { FOREST_TREES } from "./assets";
import { fire, smokeColumn, type Fire } from "./fire";
import { createCascades, type Cascades } from "../kit/cascades";
import { kingdomMap, ledger, portrait, crownLogo, sign } from "./boards";
import { createRig } from "blockrig";

export const LOCATIONS = { village: new THREE.Vector3(0, 0, 0), forest: new THREE.Vector3(1400, 0, 0), palace: new THREE.Vector3(0, 0, 1600), room: new THREE.Vector3(-1400, 0, 0) };
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type Lib = AssetLibrary;
const at = <T extends THREE.Object3D>(o: T, p: THREE.Vector3, ry = 0) => { o.position.copy(p); o.rotation.y = ry; return o; };

/** Ground with a PBR texture repeated at its real size (`studs` per tile). */
function ground(lib: Lib, tex: string, w: number, d: number, studs: number, label?: string) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lib.pbr(tex, { repeat: [w / studs, d / studs] }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.userData.label = label ?? tex; return m;
}

/** Instanced copies of a downloaded model: one InstancedMesh per mesh in it (thousands of palms in a few draws). */
/** Kenney nature colours are pastel (cyan leaves, pink trunks); tropical sawit and a dark rainforest need deep greens and browns. */
function recolour(mat: THREE.MeshStandardMaterial, leaf: string, trunk: string) {
  const m = mat.clone(), c = m.color, hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  if (hsl.h > 0.15 && hsl.h < 0.6) m.color = new THREE.Color(leaf).offsetHSL(0, 0, (hsl.l - 0.5) * 0.3); // greens and cyans: leaves
  else if (hsl.s > 0.15) m.color = new THREE.Color(trunk).offsetHSL(0, 0, (hsl.l - 0.5) * 0.25);       // pinks, reds, browns: bark
  m.roughness = 0.85; return m;
}
function instanced(lib: Lib, name: string, items: { p: THREE.Vector3; ry: number; s: number }[], o: { height: number; shadows?: boolean; tint?: string; leaf?: string; trunk?: string }) {
  const src = lib.gltf[name].scene, g = new THREE.Group(); g.userData.noCollide = true;
  src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src), k = o.height / (box.max.y - box.min.y);
  const base = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = V3(0, 1, 0);
  src.traverse((c: any) => {
    if (!c.isMesh) return;
    let mat = c.material; if (o.tint) { mat = mat.clone(); mat.color = mat.color.clone().multiply(new THREE.Color(o.tint)); }
    if (o.leaf) mat = recolour(mat, o.leaf, o.trunk ?? "#6b4a2f");
    const im = new THREE.InstancedMesh(c.geometry, mat, items.length); im.castShadow = o.shadows ?? true; im.receiveShadow = true;
    const local = base.clone().multiply(c.matrixWorld);
    items.forEach((it, i) => { q.setFromAxisAngle(Y, it.ry); m.compose(it.p, q, V3(it.s, it.s, it.s)).multiply(local); im.setMatrixAt(i, m); });
    im.computeBoundingSphere(); g.add(im);
  });
  return g;
}

/** A Roblox Toolbox map placed with its footprint centred on `pos`, its front (+Z in the map) turned to `yaw`. */
function placeMap(lib: Lib, item: RobloxCast["maps"][string], pos: THREE.Vector3, yaw: number) {
  const m = buildRobloxMap(item.data, { ...item, pbr: (n) => lib.pbr(n) }, { maxLights: 2 });
  const c = m.box.getCenter(new THREE.Vector3()), Y = V3(0, 1, 0);
  m.group.rotation.y = yaw;
  m.group.position.copy(pos).sub(V3(c.x, 0, c.z).applyAxisAngle(Y, yaw)).setY(pos.y - m.box.min.y);
  m.group.updateMatrixWorld(true);
  const world = m.box.clone().applyMatrix4(m.group.matrixWorld);
  return { ...m, world };
}

/** Highest surface of `obj` under (x, z), by a ray from above. */
function topAt(obj: THREE.Object3D, x: number, z: number, from = 400) {
  const rc = new THREE.Raycaster(V3(x, from, z), V3(0, -1, 0)), hit = rc.intersectObject(obj, true)[0];
  return hit ? hit.point.y : 0;
}

export function buildWorld(gl: THREE.WebGLRenderer, scene: THREE.Scene, lib: Lib, rb: RobloxCast | null = null) {
  const root = new THREE.Group(); root.name = "World";
  const r = rng(11), fires: { f: Fire; key: string }[] = [], smokes: { s: ReturnType<typeof smokeColumn>; key: string }[] = [];
  const addFire = (key: string, p: THREE.Vector3, o: Parameters<typeof fire>[0]) => { const f = fire(o); f.position.copy(p); root.add(f); fires.push({ f, key }); return f; };
  const far = layer(ground(lib, "grass", 6000, 6000, 10, "grass"), 0); root.add(far);

  // ================================================================ village
  const VIL = LOCATIONS.village, plan = new Plan();
  const square = layer(ground(lib, "cobble", 80, 80, 8, "square"), 2); square.position.x = VIL.x; square.position.z = VIL.z; root.add(square);
  plan.zone("square", rect(VIL.x, VIL.z, 80, 80), "#bbb");
  const fountain = lib.model("fountain", { width: 20 }); at(fountain, VIL.clone().add(V3(0, 0.02, 0))); root.add(fountain);
  // the King's golden statue on a stone plinth in the fountain (a BlockRig king at 3x, gold)
  const plinth = lib.model("towerBase", { width: 6 }); at(plinth, VIL.clone().add(V3(0, 0.5, 0))); root.add(plinth);
  const statue = createRig({ shape: "buff", outline: 0, shadows: true } as any); statue.object.scale.setScalar(2.6);
  const gold = new THREE.MeshStandardMaterial({ color: "#e8b923", metalness: 0.9, roughness: 0.28 });
  statue.object.traverse((c: any) => { if (c.isMesh) c.material = gold; });
  const plinthTop = 0.5 + (plinth.userData.size as THREE.Vector3).y;
  if (rb?.hair.kingPeci) { const cr = statue.addAccessory(rb.hair.kingPeci.mesh, { attachment: rb.hair.kingPeci.attachment, map: null, scale: rb.hair.kingPeci.scale, offset: rb.hair.kingPeci.offset }); cr.traverse((c: any) => { if (c.isMesh) c.material = gold; }); }
  statue.object.position.copy(VIL).add(V3(0, plinthTop, 0)); statue.object.rotation.y = 0; root.add(statue.object);
  const statueCrown = lib.model("coin", { height: 1.2 }); statueCrown.visible = false; // (the statue's crown is the plinth's banner below)
  const statueTop = plinthTop + 5.6 * 2.6;

  // houses around the square, each turned to face the fountain (Roblox Toolbox maps; Kenney stalls if none)
  const HOUSE_MAPS = ["mapCottage", "mapHousePorch", "mapHouseTall", "mapWoodHouse"];
  const houseSpots: { pos: THREE.Vector3; yaw: number; map: string; door: THREE.Vector3 }[] = [];
  const ANG = [-0.95, -0.35, 0.35, 0.95, Math.PI - 0.6, Math.PI + 0.6, Math.PI / 2 + 0.15, -Math.PI / 2 - 0.15];
  ANG.forEach((a, i) => {
    const map = HOUSE_MAPS[i % HOUSE_MAPS.length], item = rb?.maps[map];
    const radius = map === "mapHouseTall" ? 66 : 62, pos = VIL.clone().add(V3(Math.sin(a) * radius, 0, Math.cos(a) * radius)), yaw = a + Math.PI; // its front looks at the fountain
    if (item) {
      const m = placeMap(lib, item, pos, yaw); root.add(m.group);
      const size = m.world.getSize(new THREE.Vector3());
      plan.place(`house${i}`, rect(pos.x, pos.z, size.x, size.z), { force: true, color: "#9b59b6" });
      const front = V3(Math.sin(yaw), 0, Math.cos(yaw)), half = Math.abs(front.x) * size.x / 2 + Math.abs(front.z) * size.z / 2;
      houseSpots.push({ pos, yaw, map, door: pos.clone().addScaledVector(front, half + 2) });
    } else {
      const s = lib.model(i % 2 ? "stallRed" : "stallGreen", { width: 10 }); at(s, pos, yaw); root.add(s);
      houseSpots.push({ pos, yaw, map: "stall", door: pos.clone().addScaledVector(V3(Math.sin(yaw), 0, Math.cos(yaw)), 7) });
    }
  });
  // the hero's house: the first cottage; the school: the wooden house, with its sign
  const heroHome = houseSpots[0], school = houseSpots.find((h) => h.map === "mapWoodHouse") ?? houseSpots[3];
  const schoolSign = sign("SCHOOL", 12, 3); schoolSign.position.copy(school.door).add(V3(0, 9, 0)).addScaledVector(V3(Math.sin(school.yaw), 0, Math.cos(school.yaw)), -1.6); schoolSign.rotation.y = school.yaw; root.add(schoolSign);
  // market stalls, carts, barrels and lanterns on the square's edge
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.39, p = VIL.clone().add(V3(Math.sin(a) * 33, 0, Math.cos(a) * 33));
    const kind = ["stallRed", "cart", "stallGreen", "barrel"][i % 4], o = lib.model(kind, kind === "barrel" ? { height: 2.4 } : kind === "cart" ? { length: 7 } : { width: 7 });
    at(o, p, a + Math.PI); root.add(o); plan.place(`stall${i}`, rect(p.x, p.z, 7, 7, a), { force: true });
  }
  const lanternLights: THREE.PointLight[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, p = VIL.clone().add(V3(Math.sin(a) * 24, 0, Math.cos(a) * 24));
    root.add(at(lib.model("lantern", { height: 9 }), p));
    const l = new THREE.PointLight("#ffb35c", 0, 40, 1.5); l.position.copy(p).add(V3(0, 8.3, 0)); root.add(l); lanternLights.push(l);
  }
  // the swing under the palms by the school (no downloadable swing set: two posts, a bar, chains, a seat)
  const swing = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: "#7a4e2a", roughness: 0.8 }), iron = new THREE.MeshStandardMaterial({ color: "#555", metalness: 0.7, roughness: 0.4 });
  for (const s of [-1, 1]) for (const k of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9.4, 8), wood); leg.position.set(s * 4, 4.4, k * 1.4); leg.rotation.x = -k * 0.16; leg.castShadow = true; swing.add(leg); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8.6, 8), wood); bar.rotation.z = Math.PI / 2; bar.position.y = 9; swing.add(bar);
  const seat = new THREE.Group(); seat.position.y = 9; swing.add(seat);
  for (const s of [-0.9, 0.9]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7, 4), iron); ch.position.set(s, -3.5, 0); seat.add(ch); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.9), wood); board.position.y = -7; board.castShadow = true; seat.add(board);
  const swingAt = school.door.clone().addScaledVector(V3(Math.sin(school.yaw), 0, Math.cos(school.yaw)), 9).addScaledVector(V3(Math.cos(school.yaw), 0, -Math.sin(school.yaw)), 12); at(swing, swingAt, school.yaw); root.add(swing);

  // the planting field south of the village (s01 seedlings, s36 young trees, s37 the King alone)
  const FIELD = VIL.clone().add(V3(0, 0, -150));
  const soil = layer(ground(lib, "soil", 120, 110, 6, "field"), 1); soil.position.x = FIELD.x; soil.position.z = FIELD.z; root.add(soil);
  plan.zone("field", rect(FIELD.x, FIELD.z, 120, 110), "#8b5a2b");
  const rows: THREE.Vector3[] = []; for (let x = -48; x <= 48; x += 8) for (let z = -44; z <= 44; z += 8) rows.push(FIELD.clone().add(V3(x, 0, z)));
  const seedlings = instanced(lib, "palmShort", rows.map((p, i) => ({ p, ry: (i * 1.7) % 6.28, s: 1 })), { height: 4, leaf: "#5aa33a", trunk: "#7a5a3a" }); root.add(seedlings);
  const saplings = instanced(lib, "treeOak", rows.map((p, i) => ({ p, ry: (i * 2.3) % 6.28, s: 1 })), { height: 6, leaf: "#3f8f2f", trunk: "#6b4a2f" }); saplings.visible = false; root.add(saplings);
  // a road from the square to the field and on to the horizon
  const road = layer(ground(lib, "path", 12, 120, 8, "road"), 3); // over the square where they meet road.position.x = VIL.x; road.position.z = VIL.z - 85; root.add(road); plan.zone("road", rect(VIL.x, VIL.z - 85, 12, 120), "#c8a26a");

  // sawit to the horizon: palm rows around everything, and on low hills
  const palms: { p: THREE.Vector3; ry: number; s: number }[] = [];
  for (let x = -520; x <= 520; x += 15) for (let z = -520; z <= 520; z += 15) {
    const p = VIL.clone().add(V3(x + (r() - 0.5) * 3, 0, z + (r() - 0.5) * 3)), d = Math.hypot(x, z);
    if (d < 92 || (Math.abs(x) < 70 && z < -85 && z > -215) || (Math.abs(x) < 9 && z < -85)) continue; // the village, the field, the road
    if (!plan.free(rect(p.x, p.z, 4, 4))) continue;
    palms.push({ p, ry: r() * 6.28, s: 0.85 + r() * 0.3 });
  }
  const hills: THREE.Mesh[] = [];
  for (const [hx, hz, hr] of [[-260, 180, 120], [240, 260, 140], [300, -160, 110], [-300, -260, 130]]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(hr, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lib.pbr("grass", { repeat: [hr / 5, hr / 5] }));
    h.scale.y = 0.28; h.position.set(VIL.x + hx, -2, VIL.z + hz); h.receiveShadow = true; root.add(h); hills.push(h);
    for (const pp of palms) { const dx = pp.p.x - h.position.x, dz = pp.p.z - h.position.z, dd = Math.hypot(dx, dz); if (dd < hr) pp.p.y = Math.max(pp.p.y, -2 + hr * 0.28 * Math.sqrt(1 - (dd / hr) ** 2) - 0.3); }
  }
  root.add(instanced(lib, "palm", palms, { height: 22, leaf: "#4f8f2f", trunk: "#7a5a3a" }));
  const glowAt = VIL.clone().add(V3(0, 10, -420)); // down the road, past the field: the only clear view over the palms
  addFire("horizon", glowAt, { width: 70, height: 50, seed: 9, light: 0 }); // s11: the glow over the palms, out past the hero's door

  // ================================================================ forest
  const FOR = LOCATIONS.forest;
  const floor = layer(ground(lib, "forestFloor", 260, 300, 8, "forest floor"), 2); floor.position.x = FOR.x + 120; floor.position.z = FOR.z; root.add(floor); // over the soil where they meet
  const bare = layer(ground(lib, "soil", 320, 300, 8, "sawit soil"), 1); bare.position.x = FOR.x - 165; bare.position.z = FOR.z; root.add(bare);
  const trees: Record<string, { p: THREE.Vector3; ry: number; s: number }[]> = Object.fromEntries(FOREST_TREES.map((t) => [t, []]));
  const clear = (x: number, z: number) => (x < FOR.x + 8) || (Math.hypot(x - (FOR.x + 30), z - (FOR.z - 8)) < 13); // the edge, and the path where hero and Grandpa walk (s08)
  for (let x = FOR.x + 6; x < FOR.x + 250; x += 9) for (let z = FOR.z - 140; z < FOR.z + 140; z += 9) {
    const p = V3(x + (r() - 0.5) * 6, 0, z + (r() - 0.5) * 6);
    if (clear(p.x, p.z) || (Math.abs(p.z - FOR.z + 8) < 5 && p.x < FOR.x + 70)) continue;
    trees[FOREST_TREES[Math.floor(r() * FOREST_TREES.length)]].push({ p, ry: r() * 6.28, s: 0.8 + r() * 0.45 });
  }
  const forestGroup = new THREE.Group(); root.add(forestGroup);
  for (const t of FOREST_TREES) forestGroup.add(instanced(lib, t, trees[t], { height: 28, leaf: "#2f6b2a", trunk: "#5a3d28" }));
  const bushes: { p: THREE.Vector3; ry: number; s: number }[] = []; for (let i = 0; i < 260; i++) bushes.push({ p: V3(FOR.x + 8 + r() * 240, 0, FOR.z - 140 + r() * 280), ry: r() * 6.28, s: 0.6 + r() * 0.8 });
  forestGroup.add(instanced(lib, "bush", bushes, { height: 3, shadows: false, leaf: "#3a7a2a" }));
  // the tree the hero hides behind (s13) and the first tree the guards light (s15): real models, near the edge
  const hideTree = lib.model("treeDetailed", { height: 30 }); at(hideTree, FOR.clone().add(V3(14, 0, 14))); root.add(hideTree);
  const greenUp = (o: THREE.Object3D) => { o.traverse((c: any) => { if (c.isMesh) c.material = recolour(c.material, "#2f6b2a", "#5a3d28"); }); return o; };
  greenUp(hideTree);
  const firstTree = greenUp(lib.model("treeOak", { height: 26 })); at(firstTree, FOR.clone().add(V3(10, 0, -6))); root.add(firstTree);
  // the badge the guard loses by the first tree (s15)
  const droppedBadge = lib.model("coin", { height: 0.8 }); droppedBadge.traverse((c: any) => { if (c.isMesh) { c.material = c.material.clone(); c.material.color.set("#ffd34d"); c.material.metalness = 0.8; c.material.roughness = 0.25; } });
  droppedBadge.rotation.x = -Math.PI / 2; droppedBadge.position.copy(firstTree.position).add(V3(-4, 0.1, -1)); droppedBadge.visible = false; root.add(droppedBadge);
  const charred = new THREE.Group(); root.add(charred); // the edge trees after the fire (s29 on)
  for (let i = 0; i < 6; i++) { const t = lib.model("treeDark", { height: 22 + r() * 6 }); t.traverse((c: any) => { if (c.isMesh) { c.material = c.material.clone(); c.material.color.multiplyScalar(0.35); } }); at(t, FOR.clone().add(V3(9 + r() * 6, 0, -40 + i * 15 + r() * 4)), r() * 6); charred.add(t); }
  charred.visible = false;
  // sawit beyond the edge (what the forests became)
  const forestPalms: { p: THREE.Vector3; ry: number; s: number }[] = [];
  for (let x = FOR.x - 30; x > FOR.x - 320; x -= 15) for (let z = FOR.z - 145; z < FOR.z + 145; z += 15) forestPalms.push({ p: V3(x, 0, z), ry: r() * 6.28, s: 0.9 + r() * 0.2 });
  root.add(instanced(lib, "palm", forestPalms, { height: 22, leaf: "#4f8f2f", trunk: "#7a5a3a" }));
  // Grandpa's stump and his lantern at the edge, looking out at the sawit
  const stumpPos = FOR.clone().add(V3(-2, 0, 4)), stump = lib.model("stump", { width: 2.6 }); at(stump, stumpPos); root.add(stump);
  const stumpTop = (stump.userData.size as THREE.Vector3).y;
  const lantern = lib.model("lantern", { height: 1.6 }); at(lantern, stumpPos.clone().add(V3(1.8, 0, 0.6))); root.add(lantern);
  const lanternLight = new THREE.PointLight("#ffc06b", 0, 26, 1.6); lanternLight.position.copy(stumpPos).add(V3(1.8, 1.4, 0.6)); root.add(lanternLight);
  // fires along the edge (s15 the first tree, s28 the whole edge)
  addFire("firstTree", firstTree.position.clone().add(V3(0, 0, 0)), { width: 5, height: 16, seed: 21, shadows: 512, shadowRange: 60, lightHeight: 4 });
  // the burning edge: seven fires, but only the two facing the bucket line give light, low and strong, and both throw
  // shadows (a light without a shadow map shines through people and erased their shadows)
  for (let i = 0; i < 7; i++) addFire("edge", FOR.clone().add(V3(9 + (i % 2) * 5, 0, -42 + i * 13)), { width: 7, height: 18 + (i % 3) * 4, seed: 30 + i, light: i === 2 || i === 4 ? 70 : 0, shadows: i === 2 || i === 4 ? 1024 : 0, shadowRange: 80, lightHeight: 4 });
  const edgeSmoke = smokeColumn({ width: 30, height: 90, seed: 41 }); edgeSmoke.position.copy(FOR).add(V3(14, 8, 0)); root.add(edgeSmoke); smokes.push({ s: edgeSmoke, key: "edgeSmoke" });

  // the victim forest (s03 burning, s04 sawit by morning)
  const VIC = FOR.clone().add(V3(60, 0, 520));
  const vicGround = layer(ground(lib, "forestFloor", 200, 200, 8, "victim forest floor"), 1); vicGround.position.x = VIC.x; vicGround.position.z = VIC.z; root.add(vicGround);
  const vicBurnt = layer(ground(lib, "burnt", 200, 200, 8, "burnt"), 2); vicBurnt.position.x = VIC.x; vicBurnt.position.z = VIC.z; vicBurnt.visible = false; root.add(vicBurnt);
  const vicTrees: Record<string, { p: THREE.Vector3; ry: number; s: number }[]> = Object.fromEntries(FOREST_TREES.map((t) => [t, []])), vicPalms: { p: THREE.Vector3; ry: number; s: number }[] = [];
  for (let x = -90; x < 90; x += 9) for (let z = -90; z < 90; z += 9) vicTrees[FOREST_TREES[Math.floor(r() * 5)]].push({ p: VIC.clone().add(V3(x + (r() - 0.5) * 5, 0, z + (r() - 0.5) * 5)), ry: r() * 6.28, s: 0.8 + r() * 0.4 });
  for (let x = -90; x <= 90; x += 14) for (let z = -90; z <= 90; z += 14) vicPalms.push({ p: VIC.clone().add(V3(x, 0, z)), ry: r() * 6.28, s: 0.95 });
  const victimTrees = new THREE.Group(); for (const t of FOREST_TREES) victimTrees.add(instanced(lib, t, vicTrees[t], { height: 28, leaf: "#2f6b2a", trunk: "#5a3d28" })); root.add(victimTrees);
  const victimPalms = instanced(lib, "palm", vicPalms, { height: 22, leaf: "#4f8f2f", trunk: "#7a5a3a" }); victimPalms.visible = false; root.add(victimPalms);
  for (let i = 0; i < 9; i++) addFire("victim", VIC.clone().add(V3(-60 + (i % 3) * 45 + r() * 10, 12, -70 + Math.floor(i / 3) * 40 + r() * 10)), { width: 22, height: 34, seed: 60 + i, light: i % 3 === 0 ? 60 : 0 });
  const vicSmoke = smokeColumn({ width: 80, height: 70, seed: 71, colour: "#8a847c" }); vicSmoke.position.copy(VIC).add(V3(0, 2, 0)); root.add(vicSmoke); smokes.push({ s: vicSmoke, key: "vicSmoke" });

  // ================================================================ palace
  const PAL = LOCATIONS.palace;
  const palRoad = layer(ground(lib, "path", 16, 260, 8, "palace road"), 1); palRoad.position.x = PAL.x; palRoad.position.z = PAL.z - 120; root.add(palRoad);
  let castle: ReturnType<typeof placeMap> | null = null, gate = PAL.clone().add(V3(0, 0, 10)), balcony = PAL.clone().add(V3(0, 20, 20)), windowLedge = PAL.clone().add(V3(30, 14, 20));
  if (rb?.maps.mapCastle) {
    castle = placeMap(lib, rb.maps.mapCastle, PAL.clone().add(V3(0, 0, 95)), Math.PI); root.add(castle.group); // its front (+Z in the map) faces down the road (-Z)
    const front = castle.world.min.z; // the face towards the road
    gate = V3(PAL.x, 0, front - 2);
    const wallTop = topAt(castle.group, PAL.x, front + 4); balcony = V3(PAL.x, wallTop, front + 4);
  } else {
    for (let i = -3; i <= 3; i++) root.add(at(lib.model("castleWall", { width: 12 }), PAL.clone().add(V3(i * 12, 0, 20))));
  }
  // the King's balcony: a stone platform with banners in front of the gate (the castle's own walls hide anyone on them)
  const stand = lib.model("towerBase", { width: 9 }); at(stand, gate.clone().add(V3(0, 0, -7))); root.add(stand);
  balcony = gate.clone().add(V3(0, (stand.userData.size as THREE.Vector3).y, -7)); windowLedge = balcony.clone().add(V3(3.5, 0, -2));
  for (const s of [-1, 1]) { const f = lib.model("flag", { height: 14 }); at(f, gate.clone().add(V3(s * 5.5, 0, -7)), Math.PI / 2); root.add(f); }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const f = lib.model("flag", { height: 10 }); at(f, PAL.clone().add(V3(s * 12, 0, -30 - i * 34)), s > 0 ? Math.PI : 0); root.add(f); }
  const palaceLights: THREE.PointLight[] = [];
  for (const s of [-1, 1]) { const l = new THREE.PointLight("#ffb35c", 0, 70, 1.4); l.position.copy(gate).add(V3(s * 10, 14, -3)); root.add(l); palaceLights.push(l); }

  // ================================================================ the secret room (and the corridor in front of the portrait)
  const ROOM = LOCATIONS.room, RW = 44, RD = 32, RH = 18;
  const room = new THREE.Group(); room.position.copy(ROOM); root.add(room);
  const stone = (w: number, h: number) => lib.pbr("castleWall", { repeat: [w / 8, h / 8] });
  const wall = (w: number, h: number, p: THREE.Vector3, ry: number, label = "wall") => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), stone(w, h)); m.position.copy(p); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; m.userData.label = label; room.add(m); return m; };
  const roomFloor = layer(ground(lib, "planks", RW, RD + 40, 6, "room floor"), 1); roomFloor.position.z = 20; room.add(roomFloor);
  wall(RW, RH, V3(0, RH / 2, -RD / 2), 0, "back wall"); wall(RD, RH, V3(-RW / 2, RH / 2, 0), Math.PI / 2, "left wall"); wall(RD, RH, V3(RW / 2, RH / 2, 0), Math.PI / 2, "right wall");
  // the front wall, with a doorway the portrait closes
  const DOOR_W = 7, DOOR_H = 10;
  wall((RW - DOOR_W) / 2, RH, V3(-(RW + DOOR_W) / 4, RH / 2, RD / 2), 0, "front wall"); wall((RW - DOOR_W) / 2, RH, V3((RW + DOOR_W) / 4, RH / 2, RD / 2), 0, "front wall");
  wall(DOOR_W, RH - DOOR_H, V3(0, DOOR_H + (RH - DOOR_H) / 2, RD / 2), 0, "front wall");
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(RW, 1, RD + 40), new THREE.MeshStandardMaterial({ color: "#2a2420", roughness: 1 })); ceiling.position.set(0, RH + 0.5, 20); room.add(ceiling);
  // the corridor outside (s17): two side walls
  wall(40, RH, V3(-10, RH / 2, RD / 2 + 20), Math.PI / 2, "corridor wall"); wall(40, RH, V3(10, RH / 2, RD / 2 + 20), Math.PI / 2, "corridor wall");
  // the portrait: a door hinged on its left edge
  const hinge = new THREE.Group(); hinge.position.set(-DOOR_W / 2, 0, RD / 2 + 0.6); room.add(hinge);
  const pic = portrait(DOOR_W - 0.8, DOOR_H - 0.8); pic.position.set(DOOR_W / 2, DOOR_H / 2, 0); hinge.add(pic);
  const pic2 = pic.clone(); pic2.rotation.y = Math.PI; pic2.position.z = -0.5; hinge.add(pic2); // its back, seen from inside
  const doorLight = new THREE.PointLight("#ffd9a0", 0, 40, 1.2); doorLight.position.set(0, 7, RD / 2 + 8); room.add(doorLight);
  // the map on the back wall, the ledger on the right wall
  const theMap = kingdomMap(26, 15); theMap.position.set(-4, 9.5, -RD / 2 + 0.75); room.add(theMap);
  const book = ledger(10, 8); book.position.set(RW / 2 - 0.75, 8.5, -4); book.rotation.y = -Math.PI / 2; room.add(book);
  // the gold: a heap of coins (instanced Kenney coins) on the left, chests around it
  const coins: { p: THREE.Vector3; ry: number; s: number }[] = [], HEAP = V3(-RW / 2 + 9, 0, -3);
  for (let i = 0; i < 2600; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 8, h = Math.max(0, 7.5 * (1 - d / 8)) * (0.85 + r() * 0.15); coins.push({ p: ROOM.clone().add(HEAP).add(V3(Math.cos(a) * d, h, Math.sin(a) * d)), ry: r() * 6.28, s: 1 }); }
  const heap = instanced(lib, "coin", coins, { height: 0.7, shadows: false }); root.add(heap);
  const heapCore = new THREE.Mesh(new THREE.ConeGeometry(8, 7.2, 24), new THREE.MeshStandardMaterial({ color: "#c99a1a", metalness: 0.8, roughness: 0.35 })); heapCore.position.copy(HEAP).add(V3(0, 3.5, 0)); room.add(heapCore);
  for (const [x, z, ry] of [[-RW / 2 + 3, -12, 0.4], [-RW / 2 + 16, -11, -0.3], [-RW / 2 + 3, 6, 1.2]]) room.add(at(lib.model("chest", { width: 3.4 }), V3(x, 0, z), ry));
  // the oil barrels with the crown logo along the right wall
  const barrels: THREE.Object3D[] = [];
  for (let i = 0; i < 6; i++) for (let k = 0; k < (i % 2 ? 2 : 1); k++) {
    const b = lib.model("barrel", { height: 3.6 }), p = V3(RW / 2 - 3.2, k * 3.6, -RD / 2 + 4 + i * 4.4); at(b, p); room.add(b); barrels.push(b);
    const logo = crownLogo(1.8); logo.position.copy(p).add(V3(-1.85, 1.8, 0)); logo.rotation.y = -Math.PI / 2; room.add(logo);
  }
  for (let i = 0; i < 5; i++) room.add(at(lib.model("bottle", { height: 1.4 }), V3(RW / 2 - 8 - (i % 3) * 1.3, 0, 8 + Math.floor(i / 3) * 1.4)));
  room.add(at(lib.model("table", { width: 6 }), V3(6, 0, 4)), at(lib.model("chair", { height: 3.6 }), V3(6, 0, 8), Math.PI));
  // wall torches: small fires (they light the room)
  const roomFires: Fire[] = [];
  for (const [x, z, ry] of [[-RW / 2 + 0.8, -6, Math.PI / 2], [RW / 2 - 0.8, 8, -Math.PI / 2], [-12, -RD / 2 + 0.8, 0], [12, -RD / 2 + 0.8, 0]]) {
    const f = fire({ width: 0.8, height: 1.8, seed: 90 + roomFires.length, smoke: false, light: 18, shadows: roomFires.length >= 2 ? 512 : 0, shadowRange: 50 }); // the two on the back wall throw shadows f.position.copy(ROOM).add(V3(x, 11, z)); root.add(f); roomFires.push(f); fires.push({ f, key: "room" });
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.2, 8), new THREE.MeshStandardMaterial({ color: "#3a3a3a", metalness: 0.6 })); holder.position.copy(f.position).add(V3(0, -0.6, 0)); root.add(holder);
  }

  // ================================================================ sky, sun, weather
  const clouds = Array.from({ length: 14 }, () => { const c = lib.model("cloud", { scale: 10 + r() * 12, shadows: false }); c.userData.home = V3((r() - 0.5) * 500, 90 + r() * 50, (r() - 0.5) * 500); c.userData.noCollide = true; root.add(c); return c; });
  const birds = Array.from({ length: 6 }, (_, i) => { const b = lib.model("bird", { width: 2.6, shadows: false }); b.userData.phase = i * 1.3; b.userData.noCollide = true; root.add(b); return b; });
  let cascades: Cascades | null = null;
  const lighting = createLighting({ shadowSize: 60, sky: false }); root.add(lighting.root); lighting.root.userData.noCollide = true;
  const weather = createWeather(); root.add(weather.root); weather.root.userData.noCollide = true;
  const pmrem = new THREE.PMREMGenerator(gl), envs: Record<string, THREE.Texture> = {};
  const env = (name: string) => (envs[name] ??= pmrem.fromEquirectangular(lib.sky(name)).texture);
  checkGround(root); // two ground surfaces at one height would flicker: fail the build instead (src/kit/ground.ts)
  scene.add(root);

  const skyFor = (d: Daylight) => (d.stars > 0.6 ? "night" : d.sunIntensity < 1.2 ? "storm" : d.sunDir[1] < 0.5 ? "golden" : "day");
  const focus = new THREE.Vector3();
  return {
    root, lib, plan, glowAt, statue, statueTop, houseSpots, heroHome, school, swing, swingSeat: seat, FIELD, seedlings, saplings,
    stumpPos, stumpTop, lantern, lanternLight, firstTree, droppedBadge, hideTree, charred, VIC, victimTrees, victimPalms, vicBurnt,
    castle, gate, balcony, windowLedge, ROOM, RW, RD, hinge, theMap, book, barrels, HEAP,
    /** Fire strengths per key for this shot (0..1). */
    fires: {} as Record<string, number>,
    smokes: {} as Record<string, number>,
    update(o: { location: string; weather: Weather; daylight: Daylight; time: number; local: number; camera: THREE.Camera; fire: Record<string, number>; smoke: Record<string, number>; inside?: boolean; birds?: boolean; ownLight?: boolean }) {
      const inside = o.location === "room";
      focus.copy((LOCATIONS as any)[o.location] ?? LOCATIONS.village);
      const w = inside ? { ...o.weather, rain: 0, snow: 0, wet: 0, fog: 0, lightning: [] } : o.weather;
      const overcast = Math.min(1, w.rain * 0.9 + w.snow * 0.5);
      const { flash } = weather.update(w, o.time, o.local, o.camera);
      const skyName = overcast > 0.45 ? "storm" : skyFor(o.daylight), night = o.daylight.stars > 0.6;
      scene.background = inside ? new THREE.Color("#0d0a08") : lib.sky(skyName); if (!o.ownLight) scene.environment = env(skyName); // ownLight: a LightRig preset lights this shot
      scene.backgroundIntensity = (night ? 0.28 : 1) + flash * 2.5; scene.environmentIntensity = LOOK.env * (inside ? 0.12 : night ? 0.3 : 1);
      lighting.update({ time: o.daylight, overcast, flash, focus: inside ? focus : (o.camera as THREE.PerspectiveCamera).position.clone().setY(0) });
      // sun shadows to the horizon: cascaded shadow maps (kit/cascades.ts) instead of one 120-stud box
      cascades ??= createCascades(scene, o.camera as THREE.PerspectiveCamera, { maxFar: 700 }); cascades.update(lighting.sun);
      gl.toneMappingExposure = LOOK.exposure * o.daylight.exposure * (inside ? 1.1 : night ? 0.95 : 1);
      applyFog(scene, w, new THREE.Color(o.daylight.horizon).lerp(new THREE.Color("#7d8796"), overcast), inside ? 0.0005 : 0.0011);
      for (const { f, key } of fires) f.update(o.time, o.camera, key === "room" ? (inside ? 1 : 0) : o.fire[key] ?? 0);
      for (const { s, key } of smokes) s.update(o.time, o.smoke[key] ?? 0);
      for (const l of [...lanternLights, ...palaceLights]) l.intensity = night ? 60 : 0;
      lanternLight.intensity = night || o.daylight.stars > 0.2 ? 22 : 0;
      for (const c of clouds) { const h = c.userData.home; c.position.set(focus.x + ((h.x + o.time * 3 + 250) % 500) - 250, h.y, focus.z + h.z); c.visible = !inside && !night; }
      birds.forEach((b, i) => {
        const a = o.time * 0.35 + b.userData.phase, rad = 30 + i * 6;
        b.position.set(focus.x + Math.cos(a) * rad, 40 + i * 3 + Math.sin(o.time * 1.7 + i) * 1.5, focus.z + Math.sin(a) * rad); b.rotation.set(0, -a, 0.35);
        b.visible = !inside && !night && (o.birds ?? false);
      });
      return flash;
    },
  };
}
export type World = ReturnType<typeof buildWorld>;
