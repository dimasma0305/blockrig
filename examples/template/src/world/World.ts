// The locations (docs/visuals.md "Locations"), built from downloaded assets (src/world/assets.ts): Kenney
// suburban houses, roads, street lights, fences, trees and cars; Kenney furniture and walls for the bedroom; Poly
// Haven HDRI skies and PBR textures; Kenney clouds; birds and an animated dog from poly.pizza. Only the effects
// that must follow the camera (rain, splashes, lightning, fog, wet ground) and the sun for shadows are code.
// Each location sits far from the others so two never share a frame.
import * as THREE from "three";
import { createLighting, createWeather, applyFog, rng, type AssetLibrary, type Weather, type Daylight } from "../kit";
import { HOUSES } from "./assets";

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
  m.position.y = y - h / 2; m.receiveShadow = true; return m;
}

export function buildWorld(gl: THREE.WebGLRenderer, scene: THREE.Scene, lib: Lib) {
  const root = new THREE.Group(); root.name = "World";
  const r = rng(7), wet: { mat: THREE.MeshStandardMaterial; rough: number }[] = [];
  const wettable = (m: THREE.MeshStandardMaterial) => { wet.push({ mat: m, rough: m.roughness }); return m; };

  // ---------------------------------------------------------------- street (along Z)
  const street = new THREE.Group(); root.add(street);
  const length = 240, roadHalf = CITY / 2, walk = 6, sidewalkHalf = roadHalf + walk;
  for (let z = -length / 2; z <= length / 2; z += CITY) {
    const tile = lib.model(Math.abs(z - 15) < 1 ? "roadCrossing" : "road", { scale: CITY, shadows: false });
    street.add(at(tile, 0, 0.02, z));
    tile.traverse((c: any) => { if (c.isMesh && !wet.some((w) => w.mat === c.material)) wettable(c.material); });
  }
  for (const s of [-1, 1]) {
    const sw = strip(lib, "concrete", walk, length + 15, 4, 0.35, 0.35); sw.position.x = s * (roadHalf + walk / 2); street.add(sw); wettable(sw.material as THREE.MeshStandardMaterial);
    const lawn = strip(lib, "grass", 70, length + 15, 6, 0.2); lawn.position.x = s * (sidewalkHalf + 35); street.add(lawn); wettable(lawn.material as THREE.MeshStandardMaterial);
  }
  const far = strip(lib, "grass", 1200, 1200, 10, 0.05); far.position.y -= 0.01; root.add(far);

  // houses set back behind lawns, facing the road, with a front path, fences either side of it, trees
  const houses: { door: THREE.Vector3; facing: number; object: THREE.Object3D }[] = [];
  const perSide = 6, spacing = length / perSide;
  for (const s of [-1, 1]) for (let i = 0; i < perSide; i++) {
    const z = -length / 2 + spacing * (i + 0.5) + (r() - 0.5) * 4, setback = sidewalkHalf + 16;
    const h = lib.model(HOUSES[Math.floor(r() * HOUSES.length)], { scale: CITY });
    const size = h.userData.size as THREE.Vector3, facing = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    street.add(at(h, s * (setback + size.z / 2), 0.2, z, facing));
    const door = new THREE.Vector3(s * setback, 0.2, z);
    houses.push({ door, facing, object: h });
    const path = strip(lib, "concrete", setback - sidewalkHalf, 3.2, 4, 0.3, 0.12); path.position.set(s * (sidewalkHalf + (setback - sidewalkHalf) / 2), 0, z); street.add(path);
    // a low picket fence along the lawn edge (Kenney segments at their own size), open where the path is
    const heroLot = s > 0 && i === 2; // the hero's own front yard stays open so lawn shots can see him
    if (!heroLot) for (const dz of [-1, 1]) for (let f = 2.6; f < spacing / 2 - 2; f += 4.8) street.add(at(lib.model("fence", { scale: 10 }), s * (sidewalkHalf + 0.6), 0.2, z + dz * (f + 2.4), Math.PI / 2));
    if (r() < 0.85) street.add(at(lib.model(r() < 0.5 ? "treeLarge" : "treeSmall", { scale: CITY * (0.9 + r() * 0.3) }), s * (sidewalkHalf + 5 + r() * 7), 0.2, z + (r() < 0.5 ? -1 : 1) * (7 + r() * 5), r() * 6));
    if (r() < 0.6) street.add(at(lib.model("planter", { scale: CITY * 0.7 }), s * (setback - 2), 0.2, z + 5, facing));
    if (r() < 0.4) street.add(at(lib.model(["sedan", "suv", "taxi"][Math.floor(r() * 3)], { scale: CAR }), s * (roadHalf - 2.6), 0.02, z + 9, r() < 0.5 ? 0 : Math.PI));
  }
  for (let z = -length / 2 + 10, k = 0; z < length / 2; z += 30, k++) for (const s of [-1, 1]) street.add(at(lib.model("streetLight", { scale: CITY }), s * (roadHalf + 0.6), 0.35, z + (s > 0 ? 15 : 0), s > 0 ? Math.PI : 0));
  street.add(at(lib.model("stopSign", { scale: CITY }), roadHalf + 1.2, 0.35, 4, Math.PI));
  const heroHouse = houses.filter((h) => h.door.x > 0).sort((a, b) => a.door.z - b.door.z)[2];
  const lawn = heroHouse.door.clone().add(new THREE.Vector3(-8, 0, 0)); lawn.y = 0.2;

  // clouds drifting high up, and birds gliding in loops
  const clouds = Array.from({ length: 14 }, (_, i) => { const c = lib.model("cloud", { scale: 10 + r() * 12, shadows: false }); c.userData.home = new THREE.Vector3((r() - 0.5) * 360, 70 + r() * 45, (r() - 0.5) * 360); root.add(c); return c; });
  const birds = Array.from({ length: 5 }, (_, i) => { const b = lib.model("bird", { width: 2.6, shadows: false }); b.userData.phase = i * 1.3; root.add(b); return b; });
  const dog = lib.model("dog", { height: 2.6 }); root.add(dog);

  // ---------------------------------------------------------------- bedroom
  const B = LOCATIONS.bedroom, room = new THREE.Group(); room.position.copy(B); root.add(room);
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
  const bedSpot = { seat: new THREE.Vector3(B.x - half + 3.4 + bedSize.x / 2 - 0.3, 0, B.z - half + 5.4), top: 0.05 + bedSize.y * 0.92 };

  // ---------------------------------------------------------------- sky, sun, weather
  const lighting = createLighting({ shadowSize: 45, sky: false }); root.add(lighting.root);
  const weather = createWeather(); root.add(weather.root);
  const cloudRain = createWeather({ area: 3.2, top: 8, drops: 500, splashes: 120, flakes: 1 }); root.add(cloudRain.root);
  const rainCloud = lib.model("cloud", { scale: 6, shadows: false }); rainCloud.visible = false; root.add(rainCloud);
  const pmrem = new THREE.PMREMGenerator(gl), envs: Record<string, THREE.Texture> = {};
  const env = (name: string) => (envs[name] ??= pmrem.fromEquirectangular(lib.sky(name)).texture);

  scene.add(root);
  const focus = new THREE.Vector3(), skyFor = (d: Daylight) => (d.stars > 0.6 ? "night" : d.sunIntensity < 1.2 ? "storm" : d.sunDir[1] < 0.5 ? "golden" : "day");
  return {
    root, lib, lawn, heroHouse, houses, bedSpot, roadHalf, sidewalkHalf, dog, sidewalkY: 0.35,
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
