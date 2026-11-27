// The locations (docs/visuals.md "Locations") with lighting, weather and wet surfaces. Each location is built
// once, far from the others (so two never share a frame), and the shot's weather and time of day are applied
// every frame. Add a location: build it here, give it a place in LOCATIONS, describe it in docs/visuals.md.
import * as THREE from "three";
import { suburbanStreet, room, bed, tableLamp, desk, chair, shelf, rug, Materials, createLighting, createWeather, applyFog, applyWetness, type Weather, type Daylight } from "../kit";

export const LOCATIONS = { street: new THREE.Vector3(0, 0, 0), bedroom: new THREE.Vector3(600, 0, 0) };

export function buildWorld(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const root = new THREE.Group(); root.name = "World";
  const M = new Materials();

  // street: houses, lawns, road, lamps; the hero lives in the first house on the right
  const town = suburbanStreet({ M, seed: 7, perSide: 5, length: 200 });
  root.add(town.root);
  const heroHouse = town.houses.filter((h) => h.door.x > 0).sort((a, b) => a.door.z - b.door.z)[1];
  const lawn = heroHouse.door.clone().add(new THREE.Vector3(-9, 0, 0)); lawn.y = 0.3;

  // bedroom: bed, lamp, desk, chair, shelf, rug, window
  const bedroom = room(M, { w: 26, d: 22, h: 12, wall: "#cfe3f0", floor: "wood", floorColour: "#b48a5e" });
  bedroom.root.position.copy(LOCATIONS.bedroom); root.add(bedroom.root);
  const bedObj = bed(M, { blanket: "#1fa392", accent: "#ffd166" }); bedObj.position.set(-5, 0, -5); bedroom.root.add(bedObj);
  const lamp = tableLamp(M, true);
  const sideTable = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), M.surface("wood", { base: "#8a5a32" })); sideTable.position.set(-9.3, 1.3, -8.6); sideTable.castShadow = true; bedroom.root.add(sideTable);
  lamp.position.set(-9.3, 2.6, -8.6); bedroom.root.add(lamp);
  const deskObj = desk(M); deskObj.position.set(6, 0, -8.5); bedroom.root.add(deskObj);
  const chairObj = chair(M, "#ff7eb6"); chairObj.position.set(6, 0, -5.8); chairObj.rotation.y = Math.PI; bedroom.root.add(chairObj);
  const shelfObj = shelf(M, 3); shelfObj.position.set(12, 0, -2); shelfObj.rotation.y = -Math.PI / 2; bedroom.root.add(shelfObj);
  const rugObj = rug(M, 9, 7, "#e9c46a"); rugObj.position.set(1, 0, 1); bedroom.root.add(rugObj);
  const ceilingLight = new THREE.PointLight("#fff3dc", 30, 40, 1.4); ceilingLight.position.set(0, 10.5, 0); bedroom.root.add(ceilingLight);

  // sky, sun, weather
  const lighting = createLighting({ shadowSize: 45 });
  root.add(lighting.root);
  const weather = createWeather();
  root.add(weather.root);
  const cloudRain = createWeather({ area: 3.2, top: 8, drops: 500, splashes: 120, flakes: 1 });
  root.add(cloudRain.root);
  const cloud = new THREE.Group();
  for (const [x, y, z, s] of [[0, 0, 0, 2.2], [1.3, 0.3, 0.2, 1.6], [-1.2, 0.2, -0.3, 1.7], [0.2, 0.8, 0.1, 1.5]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 10), new THREE.MeshStandardMaterial({ color: "#7d8796", roughness: 1 })); b.position.set(x, y, z); cloud.add(b);
  }
  cloud.visible = false; root.add(cloud);

  scene.add(root);
  const focus = new THREE.Vector3();
  return {
    root, M, town, heroHouse, lawn, bedroom, bedObj, deskObj,
    /**
     * Apply a frame: where we are, the shot's weather and daylight, the lightning, and the lone cloud (if any).
     * Returns the lightning flash (0..1) for the 2D overlay.
     */
    update(o: { location: string; weather: Weather; daylight: Daylight; time: number; local: number; camera: THREE.Camera; cloudAt?: THREE.Vector3 | null }) {
      const inside = o.location === "bedroom";
      focus.copy((LOCATIONS as any)[o.location] ?? LOCATIONS.street);
      const w = inside ? { ...o.weather, rain: 0, snow: 0, wet: 0, fog: 0, lightning: [] } : o.weather;
      const overcast = Math.min(1, w.rain * 0.9 + w.fog * 0.5 + w.snow * 0.5);
      const { flash } = weather.update(w, o.time, o.local, o.camera);
      lighting.update({ time: o.daylight, overcast, flash, focus: inside ? focus : (o.camera as THREE.PerspectiveCamera).position.clone().setY(0) });
      gl.toneMappingExposure = o.daylight.exposure * (inside ? 1.1 : 1);
      applyFog(scene, w, new THREE.Color(o.daylight.horizon).lerp(new THREE.Color("#7d8796"), overcast), inside ? 0.002 : 0.004);
      for (const g of M.ground) applyWetness(g.mat, w.wet, g.dry);
      const nightK = Math.max(0, 1 - o.daylight.sunIntensity / 2.2) * 0.9 + overcast * 0.3;
      M.setNight(Math.min(1, nightK));
      // a lone rain cloud over someone (s07)
      cloud.visible = !!o.cloudAt;
      if (o.cloudAt) { cloud.position.copy(o.cloudAt).add(new THREE.Vector3(0, 8.6, 0)); cloudRain.update({ rain: 0.9, snow: 0, fog: 0, wet: 0, wind: 0, lightning: [] }, o.time, o.local, o.camera, o.cloudAt); }
      else cloudRain.update({ rain: 0, snow: 0, fog: 0, wet: 0, wind: 0, lightning: [] }, o.time, o.local, o.camera);
      return flash;
    },
  };
}
export type World = ReturnType<typeof buildWorld>;
