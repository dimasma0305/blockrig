// Time of day: a gradient sky dome with sun glow and stars, a sun with soft shadows, sky fill, and a lightning
// flash light. Presets are named in docs/story.md per shot ("time: dusk") and can be blended.
import * as THREE from "three";

export type Daylight = { top: string; horizon: string; ground: string; sun: string; sunIntensity: number; sunDir: [number, number, number]; fill: number; exposure: number; stars: number };
export const TIMES: Record<string, Daylight> = {
  day:    { top: "#4f8fe0", horizon: "#bfe0ff", ground: "#6d7f5a", sun: "#fff4e0", sunIntensity: 3.2, sunDir: [0.5, 0.9, 0.35], fill: 1.1, exposure: 1.0, stars: 0 },
  golden: { top: "#5a7fc4", horizon: "#ffc38a", ground: "#7a6a4a", sun: "#ffc78a", sunIntensity: 3.0, sunDir: [0.8, 0.35, 0.3], fill: 0.9, exposure: 1.05, stars: 0 },
  dusk:   { top: "#26305e", horizon: "#e8875f", ground: "#3d3a44", sun: "#ff9e6e", sunIntensity: 1.6, sunDir: [0.85, 0.15, 0.2], fill: 0.7, exposure: 1.15, stars: 0.3 },
  night:  { top: "#060a1e", horizon: "#1c2850", ground: "#14161e", sun: "#a9b8ff", sunIntensity: 0.6, sunDir: [-0.4, 0.8, 0.3], fill: 0.45, exposure: 1.25, stars: 1 },
  storm:  { top: "#2b313d", horizon: "#56606e", ground: "#2e3238", sun: "#cfd8e6", sunIntensity: 0.9, sunDir: [0.3, 0.9, 0.2], fill: 0.9, exposure: 1.1, stars: 0 },
};
export const daylight = (name: string | undefined) => TIMES[(name ?? "day").toLowerCase()] ?? TIMES.day;

const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`;
const SKY_FS = `
uniform vec3 uTop, uHorizon, uGround, uSun, uSunDir; uniform float uStars, uFlash, uOvercast;
varying vec3 vDir;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main(){
  float y = vDir.y;
  vec3 c = y > 0.0 ? mix(uHorizon, uTop, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(uHorizon, uGround, clamp(-y * 6.0, 0.0, 1.0));
  float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  c += uSun * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.25) * (1.0 - uOvercast);
  vec3 g = floor(vDir * 420.0);
  float star = step(0.9975, h(g)) * smoothstep(0.05, 0.4, y) * uStars * (1.0 - uOvercast);
  c += vec3(star);
  c = mix(c, vec3(dot(c, vec3(0.3, 0.5, 0.2))) * 0.8 + 0.1, uOvercast * 0.7);
  c += vec3(0.75, 0.8, 1.0) * uFlash;
  gl_FragColor = vec4(c, 1.0);
}`;

export type Lighting = {
  root: THREE.Group; sun: THREE.DirectionalLight;
  /** Apply a time of day (blend two with `mix`), overcast amount and lightning flash; focus = where shadows matter. */
  update(o: { time: Daylight; overcast?: number; flash?: number; focus?: THREE.Vector3 }): void;
};

export function createLighting({ shadowSize = 40, shadowMap = 2048, sky: showSky = true } = {}): Lighting {
  const root = new THREE.Group(); root.name = "Lighting";
  const uniforms = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uStars: { value: 0 }, uFlash: { value: 0 }, uOvercast: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ uniforms, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -1; sky.frustumCulled = false; sky.visible = showSky; root.add(sky); // off when an HDRI is the sky
  const hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1); root.add(hemi);
  const sun = new THREE.DirectionalLight("#ffffff", 3);
  sun.castShadow = true; sun.shadow.mapSize.set(shadowMap, shadowMap); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 1, far: 300 });
  root.add(sun, sun.target);
  const flash = new THREE.DirectionalLight("#dfe6ff", 0); flash.position.set(-20, 60, 10); root.add(flash);
  const focus0 = new THREE.Vector3();
  return {
    root, sun,
    update({ time, overcast = 0, flash: f = 0, focus = focus0 }) {
      uniforms.uTop.value.set(time.top); uniforms.uHorizon.value.set(time.horizon); uniforms.uGround.value.set(time.ground); uniforms.uSun.value.set(time.sun);
      uniforms.uSunDir.value.set(...time.sunDir).normalize(); uniforms.uStars.value = time.stars; uniforms.uFlash.value = f * 0.9; uniforms.uOvercast.value = overcast;
      sky.position.copy(focus);
      hemi.color.set(time.top).lerp(new THREE.Color("#ffffff"), 0.5); hemi.groundColor.set(time.ground); hemi.intensity = time.fill * (1 + 0.3 * overcast);
      sun.color.set(time.sun); sun.intensity = time.sunIntensity * (1 - 0.65 * overcast);
      sun.position.copy(focus).addScaledVector(uniforms.uSunDir.value, 120); sun.target.position.copy(focus); sun.target.updateMatrixWorld();
      flash.intensity = f * 7;
    },
  };
}

/** Blend two times of day (e.g. a sunset across a shot). */
export function mixDaylight(a: Daylight, b: Daylight, t: number): Daylight {
  const c = (x: string, y: string) => "#" + new THREE.Color(x).lerp(new THREE.Color(y), t).getHexString();
  const n = (x: number, y: number) => x + (y - x) * t;
  return { top: c(a.top, b.top), horizon: c(a.horizon, b.horizon), ground: c(a.ground, b.ground), sun: c(a.sun, b.sun), sunIntensity: n(a.sunIntensity, b.sunIntensity),
    sunDir: [n(a.sunDir[0], b.sunDir[0]), n(a.sunDir[1], b.sunDir[1]), n(a.sunDir[2], b.sunDir[2])], fill: n(a.fill, b.fill), exposure: n(a.exposure, b.exposure), stars: n(a.stars, b.stars) };
}
