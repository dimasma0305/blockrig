// Weather that is a pure function of time: rain streaks and ground splashes, snow, fog, wet ground and
// lightning. Particles live in shaders (one draw call each) and follow the camera, so any frame renders the
// same no matter the order. Pick a preset per shot in docs/story.md ("weather: storm") or pass numbers.
import * as THREE from "three";
import { rng } from "./rng";

export type Weather = {
  rain: number;      // 0..1 drops
  snow: number;      // 0..1 flakes
  fog: number;       // 0..1 haze density
  wet: number;       // 0..1 how wet (shiny) the ground is
  wind: number;      // -1..1 sideways slant
  lightning: number[]; // strike times, seconds into the shot
};
const W = (o: Partial<Weather>): Weather => ({ rain: 0, snow: 0, fog: 0, wet: 0, wind: 0, lightning: [], ...o });
export const WEATHER: Record<string, Weather> = {
  clear: W({}),
  overcast: W({ fog: 0.3 }),
  fog: W({ fog: 0.85 }),
  drizzle: W({ rain: 0.3, wet: 0.5, fog: 0.25 }),
  rain: W({ rain: 0.65, wet: 0.85, fog: 0.35, wind: 0.15 }),
  storm: W({ rain: 1, wet: 1, fog: 0.5, wind: 0.45, lightning: [0.15] }),
  snow: W({ snow: 0.7, fog: 0.3, wind: 0.1 }),
  blizzard: W({ snow: 1, fog: 0.75, wind: 0.8 }),
};

/** "storm", "rain 0.4", "clear", "snow; lightning 0.5 1.2" -> Weather. Unknown words are ignored. */
export function parseWeather(spec: string | undefined | null): Weather {
  if (!spec) return WEATHER.clear;
  let out = W({});
  for (const part of spec.split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const [name, ...nums] = part.split(/\s+/), v = nums.map(Number).filter((n) => !isNaN(n));
    if (WEATHER[name]) { out = { ...out, ...WEATHER[name], lightning: [...out.lightning, ...WEATHER[name].lightning] }; if (v.length && name !== "lightning") { const k = v[0]; out.rain *= k; out.snow *= k; out.fog *= Math.min(1, k + 0.2); } }
    else if (name === "lightning") out.lightning = v.length ? v : [0.15];
    else if (name in out && v.length) (out as any)[name] = v[0];
  }
  return out;
}
/** Blend two weathers (for a change across a shot). */
export const mixWeather = (a: Weather, b: Weather, t: number): Weather => ({
  rain: a.rain + (b.rain - a.rain) * t, snow: a.snow + (b.snow - a.snow) * t, fog: a.fog + (b.fog - a.fog) * t,
  wet: a.wet + (b.wet - a.wet) * t, wind: a.wind + (b.wind - a.wind) * t, lightning: t < 0.5 ? a.lightning : b.lightning,
});

/** Lightning brightness 0..1 at `local` seconds into the shot: a bright double flicker that decays. */
export function lightningAt(strikes: number[], local: number) {
  let f = 0;
  for (const s of strikes) {
    const d = local - s;
    if (d < 0 || d > 0.9) continue;
    f = Math.max(f, Math.exp(-d * 9) * (d < 0.05 || (d > 0.1 && d < 0.16) ? 1 : 0.45));
  }
  return f;
}

const RAIN_VS = `
attribute vec4 seed; attribute float tip;
uniform float uTime, uTop, uArea, uSpeed, uLen, uDensity, uWind; uniform vec3 uCenter;
varying float vA;
void main() {
  float fall = mod(seed.y * uTop + uTime * uSpeed * (0.85 + 0.3 * seed.z), uTop);
  vec3 p = vec3(uCenter.x + (seed.x - 0.5) * uArea, uCenter.y + uTop - fall, uCenter.z + (seed.w - 0.5) * uArea);
  vec3 dir = normalize(vec3(uWind, -1.0, 0.0));
  p -= dir * uLen * tip;
  p.x += uWind * (uCenter.y + uTop - p.y) * 0.25;
  vA = step(seed.z, uDensity) * (1.0 - tip * 0.85);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const RAIN_FS = `uniform vec3 uColor; varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(uColor, 0.38 * vA); }`;

const SPLASH_VS = `
attribute vec4 seed;
uniform float uTime, uArea, uDensity, uRate, uScale; uniform vec3 uCenter;
varying float vPhase, vOn;
float h(float n){ return fract(sin(n) * 43758.5453); }
void main() {
  float cyc = uTime * uRate + seed.z * 10.0, k = floor(cyc);
  vPhase = fract(cyc);
  vec3 p = vec3(uCenter.x + (h(k + seed.x * 91.0) - 0.5) * uArea, uCenter.y + 0.03, uCenter.z + (h(k * 1.7 + seed.y * 57.0) - 0.5) * uArea);
  vOn = step(seed.w, uDensity);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_PointSize = uScale * (0.2 + vPhase) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const SPLASH_FS = `uniform vec3 uColor; varying float vPhase, vOn;
void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c * vec2(1.0, 2.6)); float ring = smoothstep(0.5, 0.42, r) * smoothstep(0.28, 0.4, r);
  float a = ring * (1.0 - vPhase) * vOn; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a * 0.7); }`;

const SNOW_VS = `
attribute vec4 seed;
uniform float uTime, uTop, uArea, uDensity, uWind, uScale; uniform vec3 uCenter;
varying float vOn;
void main() {
  float fall = mod(seed.y * uTop + uTime * (1.2 + seed.z), uTop);
  vec3 p = vec3(uCenter.x + (seed.x - 0.5) * uArea, uCenter.y + uTop - fall, uCenter.z + (seed.w - 0.5) * uArea);
  p.x += sin(uTime * (0.8 + seed.z) + seed.w * 40.0) * 0.6 + uWind * (uCenter.y + uTop - p.y) * 0.6;
  p.z += cos(uTime * 0.7 + seed.x * 30.0) * 0.4;
  vOn = step(seed.z, uDensity);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_PointSize = uScale * (0.6 + seed.w) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const SNOW_FS = `varying float vOn; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d) * vOn; if (a < 0.01) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, a * 0.9); }`;

function seeds(count: number, seed: number, perVertex = 1) {
  const r = rng(seed), a = new Float32Array(count * perVertex * 4);
  for (let i = 0; i < count; i++) { const s = [r(), r(), r(), r()]; for (let v = 0; v < perVertex; v++) a.set(s, (i * perVertex + v) * 4); }
  return a;
}

export type WeatherFX = {
  root: THREE.Group;
  /** time: seconds since the video start; local: seconds into the shot (for lightning); camera: what we see from. */
  update(w: Weather, time: number, local: number, camera: THREE.Camera, at?: THREE.Vector3): { flash: number };
};

/** Rain, splashes and snow around the camera. `area` is the size of the box of weather that follows the camera. */
export function createWeather({ area = 46, top = 28, drops = 9000, flakes = 5000, splashes = 1400, scale = 900 } = {}): WeatherFX {
  const root = new THREE.Group(); root.name = "Weather";
  const common = { transparent: true, depthWrite: false };
  const center = new THREE.Vector3();

  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(drops * 2 * 3), 3));
  rg.setAttribute("seed", new THREE.BufferAttribute(seeds(drops, 11, 2), 4));
  rg.setAttribute("tip", new THREE.BufferAttribute(Float32Array.from({ length: drops * 2 }, (_, i) => i % 2), 1));
  const rainU = { uTime: { value: 0 }, uTop: { value: top }, uArea: { value: area }, uSpeed: { value: 30 }, uLen: { value: 0.9 }, uDensity: { value: 0 }, uWind: { value: 0 }, uCenter: { value: center }, uColor: { value: new THREE.Color("#b8c8e8") } };
  const rain = new THREE.LineSegments(rg, new THREE.ShaderMaterial({ ...common, uniforms: rainU, vertexShader: RAIN_VS, fragmentShader: RAIN_FS }));
  rain.frustumCulled = false; root.add(rain);

  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(splashes * 3), 3));
  sg.setAttribute("seed", new THREE.BufferAttribute(seeds(splashes, 23), 4));
  const splashU = { uTime: { value: 0 }, uArea: { value: area * 0.7 }, uDensity: { value: 0 }, uRate: { value: 2.2 }, uScale: { value: scale * 0.9 }, uCenter: { value: center }, uColor: { value: new THREE.Color("#dfe8ff") } };
  const splash = new THREE.Points(sg, new THREE.ShaderMaterial({ ...common, uniforms: splashU, vertexShader: SPLASH_VS, fragmentShader: SPLASH_FS }));
  splash.frustumCulled = false; root.add(splash);

  const ng = new THREE.BufferGeometry();
  ng.setAttribute("position", new THREE.BufferAttribute(new Float32Array(flakes * 3), 3));
  ng.setAttribute("seed", new THREE.BufferAttribute(seeds(flakes, 37), 4));
  const snowU = { uTime: { value: 0 }, uTop: { value: top }, uArea: { value: area }, uDensity: { value: 0 }, uWind: { value: 0 }, uScale: { value: scale * 0.12 }, uCenter: { value: center } };
  const snow = new THREE.Points(ng, new THREE.ShaderMaterial({ ...common, uniforms: snowU, vertexShader: SNOW_VS, fragmentShader: SNOW_FS }));
  snow.frustumCulled = false; root.add(snow);

  const fwd = new THREE.Vector3();
  return {
    root,
    update(w, time, local, camera, at) {
      // centre the weather box a little in front of the camera, on the ground (or at a given point: a lone cloud)
      if (at) center.copy(at);
      else { camera.getWorldPosition(center); camera.getWorldDirection(fwd); center.addScaledVector(fwd.setY(0).normalize(), area * 0.3); center.y = 0; }
      rainU.uTime.value = splashU.uTime.value = snowU.uTime.value = time;
      rainU.uDensity.value = w.rain; rainU.uWind.value = w.wind; rain.visible = w.rain > 0.001;
      splashU.uDensity.value = w.rain * Math.max(0.3, w.wet); splash.visible = w.rain > 0.001;
      snowU.uDensity.value = w.snow; snowU.uWind.value = w.wind; snow.visible = w.snow > 0.001;
      return { flash: lightningAt(w.lightning, local) };
    },
  };
}

/** A procedural roughness map with puddles, for wet ground (repeat it over the ground). */
export function puddleMap(size = 256, seed = 5) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d")!, r = rng(seed);
  g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 26; i++) {
    const x = r() * size, y = r() * size, rx = 10 + r() * 34, ry = 6 + r() * 18;
    const grd = g.createRadialGradient(x, y, 0, x, y, rx);
    grd.addColorStop(0, "#101010"); grd.addColorStop(0.7, "#2a2a2a"); grd.addColorStop(1, "rgba(200,200,200,0)");
    g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, rx, ry, r() * Math.PI, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** Make a ground material look wet: shinier, darker, with puddles. Call per frame with the shot's wetness. */
export function applyWetness(m: THREE.MeshStandardMaterial, wet: number, dry: { roughness: number; color: THREE.Color }) {
  m.roughness = dry.roughness + (0.12 - dry.roughness) * wet;
  m.metalness = 0.05 + 0.25 * wet;
  m.color.copy(dry.color).multiplyScalar(1 - 0.35 * wet);
  m.envMapIntensity = 1 + 1.5 * wet;
}

/** Fog for the weather (exponential, coloured like the sky's horizon). */
export function applyFog(scene: THREE.Scene, w: Weather, colour: THREE.ColorRepresentation, base = 0.001) {
  const density = base + w.fog * 0.03 + w.rain * 0.006 + w.snow * 0.01;
  if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(colour, density);
  (scene.fog as THREE.FogExp2).density = density; (scene.fog as THREE.FogExp2).color.set(colour);
}
