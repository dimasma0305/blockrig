// The locations (docs/visuals.md "Locations"), built from downloaded assets (src/world/assets.ts): Kenney
// suburban houses, roads, street lights, fences, trees and cars; Kenney furniture and walls for the bedroom; Poly
// Haven HDRI skies and PBR textures; Kenney clouds; birds and an animated dog from poly.pizza. Only the effects
// that must follow the camera (rain, splashes, lightning, fog, wet ground) and the sun for shadows are code.
// Each location sits far from the others so two never share a frame.
import * as THREE from "three";
import { createLighting, createWeather, applyFog, rng, type AssetLibrary, type Weather, type Daylight } from "../kit";
import { HOUSES } from "./assets";
import { buildRobloxMap } from "../kit/robloxMap";
import { Plan, rect, circle } from "../kit/plan";
import type { RobloxCast } from "../cast/roblox";

// LOCAL --roblox only: a free Toolbox room replaces the Kenney bedroom. Numbers are in the map's own studs (read
// them off `npm run stills -- --comp MapLab` and map.json): the room's floor centre, the bed model, and where the
// wide shot stands and looks. Swap the map by changing these (see the world skill, "Roblox maps").
// and a Toolbox house for the hero's lot (map studs): `edge` is where its lot meets the street (the end of its
// driveway, level with the middle of the house), `door` the middle of its facade, `faces` the way its front looks
// (+Z here), `span` its width along the street around `edge`, `depth` from the street edge to the back fence.
const ROBLOX_HOUSE = { map: "mapHouseA", edge: new THREE.Vector3(-15.8, 0.1, 136), door: new THREE.Vector3(-15.8, 0.1, 92), faces: new THREE.Vector3(0, 0, 1), span: [-36, 70], depth: 140 };
const ROBLOX_ROOM = { map: "mapBedroomA", floor: new THREE.Vector3(80.7, 1.25, 192.4), bed: /^BigBed$/, blanket: /^Blanket$/, view: { from: new THREE.Vector3(88.5, 8.2, 184.5), to: new THREE.Vector3(75.5, 3.6, 196) },
  inner: new THREE.Box3(new THREE.Vector3(69.1, 1.25, 181.3), new THREE.Vector3(92.4, 13.5, 203.6)) }; // the walls' inner faces: cameras stay inside

export const LOCATIONS = { street: new THREE.Vector3(0, 0, 0), bedroom: new THREE.Vector3(600, 0, 0) };
const CITY = 15;     // Kenney city kits: 1 unit = 15 studs (a road tile is 15 studs wide)
const CAR = 3.5;     // car kit: a sedan is ~9 studs long
const FURN = 5.5;    // furniture kit: a bed is ~9.5 studs long, a desk ~2 studs high
const WALL = 7;      // furniture kit walls: 7 studs wide, 9 high

type Lib = AssetLibrary;
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };

/** Ground strips with a PBR texture repeated at its real size (`studs` per texture tile). */
function strip(lib: Lib, tex: string, w: number, d: number, studs: number, y = 0, h = 0.2) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lib.pbr(tex, { repeat: [w / studs, d / studs] }));
  m.position.y = y - h / 2; m.receiveShadow = true; m.userData.label = tex === "concrete" ? "sidewalk" : tex === "grass" ? "lawn" : tex; return m;
}

export function buildWorld(gl: THREE.WebGLRenderer, scene: THREE.Scene, lib: Lib, rb: RobloxCast | null = null) {
  const root = new THREE.Group(); root.name = "World";
  const r = rng(7), wet: { mat: THREE.MeshStandardMaterial; rough: number }[] = [];
  const wettable = (m: THREE.MeshStandardMaterial) => { wet.push({ mat: m, rough: m.roughness }); return m; };

  // ---------------------------------------------------------------- street (along Z)
  const street = new THREE.Group(); root.add(street);
  const length = 240, roadHalf = CITY / 2, walk = 6, sidewalkHalf = roadHalf + walk;
  for (let z = -length / 2; z <= length / 2; z += CITY) {
    const tile = lib.model(Math.abs(z - 15) < 1 ? "roadCrossing" : "road", { scale: CITY, shadows: false });
    street.add(at(tile, 0, 0.02, z, Math.PI / 2)); // Kenney road tiles run along X: turn them to run along the street (Z)
    tile.traverse((c: any) => { if (c.isMesh && !wet.some((w) => w.mat === c.material)) wettable(c.material); });
  }
  for (const s of [-1, 1]) {
    const sw = strip(lib, "concrete", walk, length + 15, 4, 0.35, 0.35); sw.position.x = s * (roadHalf + walk / 2); street.add(sw); wettable(sw.material as THREE.MeshStandardMaterial);
    const lawn = strip(lib, "grass", 70, length + 15, 6, 0.2); lawn.position.x = s * (sidewalkHalf + 35); street.add(lawn); wettable(lawn.material as THREE.MeshStandardMaterial);
  }
  const far = strip(lib, "grass", 1200, 1200, 10, 0.05); far.position.y -= 0.01; root.add(far);

  // ---- the 2D plan first (src/kit/plan.ts, Turf): keep-out zones, then footprints, then what fills the gaps.
  // Nothing may overlap the road, the sidewalks, a path or the "stage" where the hero acts and the cameras look;
  // houses, fences, trees, planters and cars are placed only where they fit. PlanLab draws it from above.
  const plan = new Plan(), perSide = 6, spacing = length / perSide, setback = sidewalkHalf + 16, depth = 70;
  plan.zone("road", rect(0, 0, CITY, length + 15), "#555");
  plan.zone("crossing", rect(0, 15, CITY, CITY), "#888"); // no parked cars on the crosswalk
  for (const s of [-1, 1]) plan.zone(`sidewalk${s > 0 ? "R" : "L"}`, rect(s * (roadHalf + walk / 2), 0, walk, length + 15), "#bbb");
  const lotZ = (s: number, i: number) => -length / 2 + spacing * (i + 0.5) + (s > 0 ? 0.8 : -1.3) * ((i * 7) % 5 - 2); // gentle irregularity
  const heroZ = lotZ(1, 2), heroDoor = new THREE.Vector3(setback, 0.2, heroZ);
  const lawn = heroDoor.clone().add(new THREE.Vector3(-8, 0, 0)); lawn.y = 0.2;
  // the stage: the hero's lawn and the ground between it and the road, where the s04-s07 cameras stand
  plan.zone("stage", rect((sidewalkHalf + lawn.x + 5) / 2, lawn.z - 3, lawn.x + 5 - sidewalkHalf, 26), "#f2c94c");

  const houses: { door: THREE.Vector3; facing: number; object: THREE.Object3D }[] = [];
  let heroHouse: { door: THREE.Vector3; facing: number; object: THREE.Object3D } | null = null;
  const houseMap = rb?.maps[ROBLOX_HOUSE.map];
  if (houseMap) {
    // the Toolbox house on the hero's lot: turned so its front looks at the road, its driveway end on the sidewalk
    // edge; its whole footprint (with its own yard) is reserved, so the kit houses and trees around it make room
    const m = buildRobloxMap(houseMap.data, { ...houseMap, pbr: (n) => lib.pbr(n) }, { maxLights: 2 });
    const toRoad = new THREE.Vector3(-1, 0, 0), turn = Math.atan2(toRoad.x, toRoad.z) - Math.atan2(ROBLOX_HOUSE.faces.x, ROBLOX_HOUSE.faces.z);
    const Y = new THREE.Vector3(0, 1, 0);
    m.group.rotation.y = turn;
    m.group.position.set(sidewalkHalf + 0.3, 0.1, heroZ).sub(ROBLOX_HOUSE.edge.clone().applyAxisAngle(Y, turn));
    m.group.updateMatrix();
    const fp = m.box.clone().applyMatrix4(m.group.matrix), c = fp.getCenter(new THREE.Vector3()), size = fp.getSize(new THREE.Vector3());
    plan.place("robloxHouse", rect(c.x, c.z, size.x, size.z), { force: true, except: ["stage", "sidewalkR"], color: "#9b59b6" }); // its front yard is the stage
    street.add(m.group);
    heroHouse = { door: ROBLOX_HOUSE.door.clone().applyAxisAngle(Y, turn).add(m.group.position), facing: -Math.PI / 2, object: m.group }; // the camera looks up at the real door
  }

  // lots: a house set back behind its lawn facing the road, a path to the door, a fence along the front, trees
  for (const s of [-1, 1]) for (let i = 0; i < perSide; i++) {
    const z = lotZ(s, i), side = s > 0 ? "R" : "L", facing = s > 0 ? -Math.PI / 2 : Math.PI / 2, isHero = s > 0 && i === 2;
    plan.area(`lot${side}${i}`, rect(s * (sidewalkHalf + depth / 2), z, depth, spacing - 1));
    if (!(isHero && heroHouse)) {
      const h = lib.model(HOUSES[Math.floor(r() * HOUSES.length)], { scale: CITY }), size = h.userData.size as THREE.Vector3;
      const hx = s * (setback + size.z / 2);
      if (plan.place(`house${side}${i}`, rect(hx, z, size.x, size.z, facing), { except: isHero ? ["stage"] : [] })) {
        street.add(at(h, hx, 0.2, z, facing));
        const door = new THREE.Vector3(s * setback, 0.2, z), house = { door, facing, object: h };
        houses.push(house); if (isHero) heroHouse = house;
        const pathShape = rect(s * (sidewalkHalf + (setback - sidewalkHalf - 0.4) / 2), z, setback - sidewalkHalf - 0.4, 3.2); // stops just short of the house
        plan.zone(`path${side}${i}`, pathShape, "#d9d0c1");
        const path = strip(lib, "concrete", setback - sidewalkHalf, 3.2, 4, 0.3, 0.12); path.position.set(s * (sidewalkHalf + (setback - sidewalkHalf) / 2), 0, z); street.add(path);
      }
    }
    // a low picket fence along the lawn edge (Kenney segments at their own size); gaps appear wherever a path,
    // the stage or a Roblox lot is, because a segment is only placed where it fits
    for (const [fx, fz] of plan.along([s * (sidewalkHalf + 0.8), z - spacing / 2 + 2.6], [s * (sidewalkHalf + 0.8), z + spacing / 2 - 2.6], 4.8, 0.4))
      if (plan.place(`fence${side}${i}-${fz.toFixed(0)}`, rect(fx, fz, 0.5, 4.4), { color: "#b07a4f" })) street.add(at(lib.model("fence", { scale: 10 }), fx, 0.2, fz, Math.PI / 2));
    // trees in the front yard and a planter by the door, where they fit
    const yard = rect(s * (sidewalkHalf + 3 + (setback - sidewalkHalf - 4) / 2), z, setback - sidewalkHalf - 4, spacing - 6);
    for (const [tx, tz] of plan.scatter(yard, { count: r() < 0.5 ? 2 : 1, radius: 2.4, gap: 11, rng: r, name: `tree${side}${i}` }))
      street.add(at(lib.model(r() < 0.5 ? "treeLarge" : "treeSmall", { scale: CITY * (0.9 + r() * 0.3) }), tx, 0.2, tz, r() * 6));
    if (r() < 0.6 && plan.place(`planter${side}${i}`, rect(s * (setback - 2), z + 5, 2.6, 2.6))) street.add(at(lib.model("planter", { scale: CITY * 0.7 }), s * (setback - 2), 0.2, z + 5, facing));
    // a parked car at the kerb, clear of the crossing and the other cars
    const cz = z + 9, carShape = rect(s * (roadHalf - 2.6), cz, 4.4, 9.5);
    if (r() < 0.4 && plan.place(`car${side}${i}`, carShape, { except: ["road"], color: "#e67e22" }))
      street.add(at(lib.model(["sedan", "suv", "taxi"][Math.floor(r() * 3)], { scale: CAR }), s * (roadHalf - 2.6), 0.02, cz, r() < 0.5 ? 0 : Math.PI));
  }
  // street lights and the stop sign stand on the sidewalk
  for (let z = -length / 2 + 10; z < length / 2; z += 30) for (const s of [-1, 1]) {
    const lz = z + (s > 0 ? 15 : 0), lx = s * (roadHalf + 0.6);
    if (plan.place(`light${s > 0 ? "R" : "L"}${lz}`, circle(lx, lz, 0.6, 8), { except: [`sidewalk${s > 0 ? "R" : "L"}`], color: "#f1c40f" })) street.add(at(lib.model("streetLight", { scale: CITY }), lx, 0.35, lz, s > 0 ? Math.PI : 0));
  }
  if (plan.place("stopSign", circle(roadHalf + 1.2, 4, 0.6, 8), { except: ["sidewalkR"] })) street.add(at(lib.model("stopSign", { scale: CITY }), roadHalf + 1.2, 0.35, 4, Math.PI));
  if (!heroHouse) throw new Error("the hero's lot has no house: see the plan (PlanLab)");

  // clouds drifting high up, and birds gliding in loops
  const clouds = Array.from({ length: 14 }, (_, i) => { const c = lib.model("cloud", { scale: 10 + r() * 12, shadows: false }); c.userData.home = new THREE.Vector3((r() - 0.5) * 360, 70 + r() * 45, (r() - 0.5) * 360); c.userData.noCollide = true; root.add(c); return c; });
  const birds = Array.from({ length: 5 }, (_, i) => { const b = lib.model("bird", { width: 2.6, shadows: false }); b.userData.phase = i * 1.3; b.userData.noCollide = true; root.add(b); return b; });
  const dog = lib.model("dog", { height: 2.6 }); dog.userData.noCollide = true; root.add(dog); // moving things: not colliders

  // ---------------------------------------------------------------- bedroom
  const B = LOCATIONS.bedroom, V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  let bedSpot: { seat: THREE.Vector3; top: number }, bedView: { from: THREE.Vector3; to: THREE.Vector3 }, roomBox: THREE.Box3 | null = null;
  const roomMap = rb?.maps[ROBLOX_ROOM.map];
  if (roomMap) {
    // the Toolbox room, moved so its floor centre sits on the bedroom location; it brings its own lights too
    const m = buildRobloxMap(roomMap.data, { ...roomMap, pbr: (n) => lib.pbr(n) }), shift = B.clone().sub(ROBLOX_ROOM.floor);
    m.group.position.copy(shift); root.add(m.group);
    const bed = m.find(ROBLOX_ROOM.bed).translate(shift), bc = bed.getCenter(new THREE.Vector3());
    // sit on the long side that faces the room's centre, a little below the blanket top
    // (hips over the mattress, on top of the blanket: npm run collide checks both)
    const side = Math.sign(B.x - bc.x) || 1, blanket = m.find(ROBLOX_ROOM.blanket).translate(shift);
    bedSpot = { seat: V3(side > 0 ? bed.max.x - 0.9 : bed.min.x + 0.9, 0, bc.z - 1), top: blanket.isEmpty() ? B.y + (bed.max.y - B.y) * 0.62 : blanket.max.y - 0.2 };
    bedView = { from: ROBLOX_ROOM.view.from.clone().add(shift), to: ROBLOX_ROOM.view.to.clone().add(shift) };
    roomBox = ROBLOX_ROOM.inner.clone().translate(shift).expandByScalar(-0.8);
    const fill = new THREE.PointLight("#fff1dc", 22, 40, 1.3); fill.position.set(B.x, B.y + 9.5, B.z); root.add(fill);
  } else {
    const room = new THREE.Group(); room.position.copy(B); root.add(room);
    const half = WALL * 1.5; // a 3 x 3 wall room, 21 x 21 studs, open towards +Z for the camera
    room.add(strip(lib, "planks", half * 2, half * 2, 6, 0.05));
    ["wall", "wallWindow", "wall"].forEach((n, i) => room.add(at(lib.model(n, { width: WALL }), -WALL + i * WALL, 0, -half)));
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) room.add(at(lib.model(i === 1 && s > 0 ? "wallWindow" : "wall", { width: WALL }), s * half, 0, -WALL + i * WALL, Math.PI / 2));
    const bed = lib.model("bed", { scale: FURN }); room.add(at(bed, -half + 3.4, 0.05, -half + 5.4));
    const bedSize = bed.userData.size.clone(); // already in studs
    room.add(at(lib.model("pillow", { scale: FURN }), -half + 3.4, 2.0, -half + 1.6), at(lib.model("bear", { scale: FURN * 0.8 }), -half + 2.4, 2.0, -half + 7.4, 0.6));
    room.add(at(lib.model("sideTable", { scale: FURN }), -half + 8.6, 0.05, -half + 1.3), at(lib.model("lamp", { scale: FURN }), -half + 8.6, 2.15, -half + 1.3));
    room.add(at(lib.model("desk", { scale: FURN }), half - 4.6, 0.05, -half + 1.4), at(lib.model("monitor", { scale: FURN }), half - 4.6, 2.15, -half + 1.2), at(lib.model("chair", { scale: FURN }), half - 4.6, 0.05, -half + 4, Math.PI));
    room.add(at(lib.model("bookcase", { scale: FURN }), half - 1.2, 0.05, 2, -Math.PI / 2), at(lib.model("books", { scale: FURN }), half - 1.3, 4.9, 2, -Math.PI / 2));
    room.add(at(lib.model("rug", { scale: FURN }), 0.5, 0.06, 1.5), at(lib.model("plant", { scale: FURN }), half - 1.5, 0.05, half - 3));
    const lampLight = new THREE.PointLight("#ffcf8a", 14, 22, 1.6); lampLight.position.set(-half + 8.6, 3.6, -half + 1.6); room.add(lampLight);
    const ceiling = new THREE.PointLight("#fff3dc", 26, 40, 1.4); ceiling.position.set(0, 8.5, 0); room.add(ceiling);
    bedSpot = { seat: new THREE.Vector3(B.x - half + 3.4 + bedSize.x / 2 - 0.3, 0, B.z - half + 5.4), top: 0.05 + bedSize.y - 0.7 }; // the mattress is 0.7 below the headboard top (measured: npm run collide)
    bedView = { from: V3(B.x - 4.2, 7.4, B.z + 14), to: V3(B.x - 3.2, 2.6, B.z - 4) };

  }

  // ---------------------------------------------------------------- sky, sun, weather
  const lighting = createLighting({ shadowSize: 45, sky: false }); root.add(lighting.root); lighting.root.userData.noCollide = true;
  const weather = createWeather(); root.add(weather.root); weather.root.userData.noCollide = true;
  const cloudRain = createWeather({ area: 3.2, top: 8, drops: 500, splashes: 120, flakes: 1 }); root.add(cloudRain.root); cloudRain.root.userData.noCollide = true;
  const rainCloud = lib.model("cloud", { scale: 6, shadows: false }); rainCloud.visible = false; rainCloud.userData.noCollide = true; root.add(rainCloud);
  const pmrem = new THREE.PMREMGenerator(gl), envs: Record<string, THREE.Texture> = {};
  const env = (name: string) => (envs[name] ??= pmrem.fromEquirectangular(lib.sky(name)).texture);

  scene.add(root);
  const focus = new THREE.Vector3(), skyFor = (d: Daylight) => (d.stars > 0.6 ? "night" : d.sunIntensity < 1.2 ? "storm" : d.sunDir[1] < 0.5 ? "golden" : "day");
  return {
    root, lib, lawn, heroHouse: heroHouse!, houses, bedSpot, bedView, roomBox, plan, roadHalf, sidewalkHalf, dog, sidewalkY: 0.35,
    update(o: { location: string; weather: Weather; daylight: Daylight; time: number; local: number; camera: THREE.Camera; cloudAt?: THREE.Vector3 | null }) {
      const inside = o.location === "bedroom";
      focus.copy((LOCATIONS as any)[o.location] ?? LOCATIONS.street);
      const w = inside ? { ...o.weather, rain: 0, snow: 0, wet: 0, fog: 0, lightning: [] } : o.weather;
      const overcast = Math.min(1, w.rain * 0.9 + w.fog * 0.5 + w.snow * 0.5);
      const { flash } = weather.update(w, o.time, o.local, o.camera);
      const skyName = overcast > 0.45 ? "storm" : skyFor(o.daylight);
      scene.background = lib.sky(skyName); scene.environment = env(skyName);
      scene.backgroundIntensity = (skyName === "storm" ? 0.55 : 1) * (1 + flash * 2.5); scene.environmentIntensity = (skyName === "storm" ? 0.6 : 1) * (inside ? 0.6 : 1);
      lighting.update({ time: o.daylight, overcast, flash, focus: inside ? focus : (o.camera as THREE.PerspectiveCamera).position.clone().setY(0) });
      gl.toneMappingExposure = o.daylight.exposure * (inside ? 1.05 : 1);
      applyFog(scene, w, new THREE.Color(o.daylight.horizon).lerp(new THREE.Color("#7d8796"), overcast), inside ? 0.001 : 0.003);
      for (const g of wet) { g.mat.roughness = g.rough + (0.12 - g.rough) * w.wet; g.mat.envMapIntensity = 1 + 1.5 * w.wet; }
      // clouds drift with the wind; birds glide in slow loops (hidden in rain)
      for (const c of clouds) { const h = c.userData.home; c.position.set(((h.x + o.time * (2 + w.wind * 6) + 180) % 360) - 180, h.y, h.z); c.visible = !inside; }
      birds.forEach((b, i) => {
        const a = o.time * 0.35 + b.userData.phase, rad = 30 + i * 6;
        b.position.set(Math.cos(a) * rad, 38 + i * 3 + Math.sin(o.time * 1.7 + i) * 1.5, Math.sin(a) * rad - 10);
        b.rotation.set(0, -a, 0.35 + 0.15 * Math.sin(o.time * 2 + i)); b.visible = !inside && w.rain < 0.3;
      });
      rainCloud.visible = !!o.cloudAt;
      if (o.cloudAt) { rainCloud.position.copy(o.cloudAt).add(new THREE.Vector3(0, 8, 0)); cloudRain.update({ rain: 0.9, snow: 0, fog: 0, wet: 0, wind: 0, lightning: [] }, o.time, o.local, o.camera, o.cloudAt); }
      else cloudRain.update({ rain: 0, snow: 0, fog: 0, wet: 0, wind: 0, lightning: [] }, o.time, o.local, o.camera);
      return flash;
    },
  };
}
export type World = ReturnType<typeof buildWorld>;
