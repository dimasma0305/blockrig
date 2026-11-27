// Fire, smoke, embers and water spray. All frame-pure: every function of time t (seconds), no state carried
// between frames (vfx skill). Flames are camera-facing planes with a scrolling-noise shader (additive, not tone
// mapped), embers and smoke loop on t, and each fire has one flickering point light.
import * as THREE from "three";
import { rng } from "../kit/rng";

const NOISE = `
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { v += a * n(p); p *= 2.03; a *= 0.5; } return v; }`;

function flameMaterial(seed: number) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uPower: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `${NOISE}
      uniform float uTime, uSeed, uPower; varying vec2 vUv;
      void main(){
        vec2 uv = vUv; float t = uTime * 1.6 + uSeed * 7.0;
        float noise = fbm(vec2(uv.x * 3.0 + uSeed, uv.y * 2.2 - t));
        // a teardrop: wide at the bottom, licking up to a point, broken up by the noise
        float width = mix(0.42, 0.04, pow(uv.y, 0.8));
        float body = 1.0 - smoothstep(width * 0.55, width, abs(uv.x - 0.5) + (noise - 0.5) * 0.28);
        float top = 1.0 - smoothstep(0.35, 1.0, uv.y + (noise - 0.5) * 0.55);
        float a = body * top * smoothstep(0.0, 0.08, uv.y) * uPower;
        vec3 hot = vec3(1.0, 0.92, 0.55), mid = vec3(1.0, 0.48, 0.08), cool = vec3(0.75, 0.1, 0.02);
        vec3 c = mix(hot, mid, smoothstep(0.1, 0.45, uv.y + (1.0 - body) * 0.4)); c = mix(c, cool, smoothstep(0.5, 0.95, uv.y));
        gl_FragColor = vec4(c * a * 1.7, a);
      }`,
  });
}

let glowTex: THREE.Texture | null = null;
function softDot() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (glowTex = new THREE.CanvasTexture(c));
}

/** Particles that rise and loop (embers, smoke), positions a pure function of time. */
function riser(count: number, o: { radius: number; height: number; speed: number; size: number; colour: string; additive: boolean; opacity: number; seed: number; drift?: number }) {
  const r = rng(o.seed), pos = new Float32Array(count * 3), phase = new Float32Array(count);
  for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * o.radius; pos.set([Math.cos(a) * d, 0, Math.sin(a) * d], i * 3); phase[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !o.additive,
    uniforms: { uTime: { value: 0 }, uH: { value: o.height }, uSpeed: { value: o.speed }, uSize: { value: o.size }, uColor: { value: new THREE.Color(o.colour) }, uOpacity: { value: o.opacity }, uDrift: { value: o.drift ?? 1 }, uMap: { value: softDot() } },
    vertexShader: `attribute float aPhase; uniform float uTime, uH, uSpeed, uSize, uDrift; varying float vLife;
      void main(){ float life = fract(aPhase + uTime * uSpeed / uH); vLife = life;
        vec3 p = position * (1.0 + life * 0.8) + vec3(sin(uTime * 1.3 + aPhase * 30.0) * uDrift * life, life * uH, cos(uTime * 1.1 + aPhase * 20.0) * uDrift * life);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uSize * (300.0 / -mv.z) * (0.5 + life); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform sampler2D uMap; varying float vLife;
      void main(){ float a = texture2D(uMap, gl_PointCoord).a * smoothstep(0.0, 0.15, vLife) * (1.0 - vLife) * uOpacity; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return { pts, m };
}

export type Fire = THREE.Group & { update(t: number, camera: THREE.Camera, power: number): void };

/** A fire `width` studs across and `height` tall: flame planes, a glow, embers, smoke and a flickering light. */
export function fire(o: { width: number; height: number; seed: number; smoke?: boolean; light?: number }): Fire {
  const g = new THREE.Group() as Fire, r = rng(o.seed); g.userData.noCollide = true;
  const flames: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; base: number }[] = [];
  const n = Math.max(2, Math.round(o.width / 1.6));
  for (let i = 0; i < n; i++) {
    const w = o.height * (0.45 + r() * 0.3), hgt = o.height * (0.7 + r() * 0.45), mat = flameMaterial(r() * 10);
    const geo = new THREE.PlaneGeometry(w, hgt); geo.translate(0, hgt / 2, 0);
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set((r() - 0.5) * o.width, 0, (r() - 0.5) * o.width * 0.6); mesh.renderOrder = 5;
    g.add(mesh); flames.push({ mesh, mat, base: hgt });
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: "#ff8a2a", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.scale.set(o.width * 2.2 + o.height, o.height * 1.6, 1); glow.position.y = o.height * 0.45; g.add(glow);
  const embers = riser(Math.round(30 + o.width * 6), { radius: o.width * 0.5, height: o.height * 2.6, speed: 3.5, size: 0.35, colour: "#ffb347", additive: true, opacity: 1, seed: o.seed + 1, drift: 1.5 });
  g.add(embers.pts);
  const smoke = o.smoke === false ? null : riser(Math.round(14 + o.width * 2), { radius: o.width * 0.45, height: o.height * 5, speed: 2.2, size: o.height * 1.6, colour: "#2b2622", additive: false, opacity: 0.55, seed: o.seed + 2, drift: 3 });
  if (smoke) { smoke.pts.position.y = o.height * 0.6; g.add(smoke.pts); }
  const light = new THREE.PointLight("#ff7a1e", (o.light ?? 30) * 4, o.height * 8 + o.width * 3, 1); light.position.y = o.height * 0.6; g.add(light);
  const tmp = new THREE.Vector3();
  g.update = (t, camera, power) => {
    g.visible = power > 0.01;
    if (!g.visible) return;
    camera.getWorldPosition(tmp);
    for (const f of flames) {
      f.mat.uniforms.uTime.value = t; f.mat.uniforms.uPower.value = power;
      const wp = f.mesh.getWorldPosition(new THREE.Vector3()); f.mesh.rotation.y = Math.atan2(tmp.x - wp.x, tmp.z - wp.z) - g.rotation.y; // turn to the camera (upright)
      f.mesh.scale.y = 0.35 + 0.65 * power;
    }
    (embers.m.uniforms.uTime.value = t), (embers.m.uniforms.uOpacity.value = power);
    if (smoke) { smoke.m.uniforms.uTime.value = t; smoke.m.uniforms.uOpacity.value = 0.55 * Math.min(1, power + 0.3); }
    const flick = 0.75 + 0.25 * Math.sin(t * 17.3 + o.seed) * Math.sin(t * 7.1 + o.seed * 3);
    light.intensity = (o.light ?? 30) * 4 * power * flick; glow.material.opacity = 0.55 * power * (0.85 + 0.15 * flick);
  };
  return g;
}

/** Smoke only (after the fire is out): a slow dark column. */
export function smokeColumn(o: { width: number; height: number; seed: number; colour?: string }) {
  const s = riser(40, { radius: o.width * 0.5, height: o.height, speed: 1.4, size: o.width * 1.4, colour: o.colour ?? "#5b5650", additive: false, opacity: 0.5, seed: o.seed, drift: 4 });
  const g = new THREE.Group() as THREE.Group & { update(t: number, power: number): void }; g.add(s.pts); g.userData.noCollide = true;
  g.update = (t, power) => { g.visible = power > 0.01; s.m.uniforms.uTime.value = t; s.m.uniforms.uOpacity.value = 0.5 * power; };
  return g;
}

/** A water stream from a bucket or hose: drops on an arc from `from` along `dir`, looping. */
export function spray(seed: number, o: { speed?: number; count?: number } = {}) {
  const count = o.count ?? 90, r = rng(seed), off = new Float32Array(count * 3), phase = new Float32Array(count);
  for (let i = 0; i < count; i++) { off.set([(r() - 0.5) * 0.4, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4], i * 3); phase[i] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(off, 3)); geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uDir: { value: new THREE.Vector3(0, 0, 1) }, uSpeed: { value: o.speed ?? 12 }, uMap: { value: softDot() }, uOn: { value: 1 } },
    vertexShader: `attribute float aPhase; uniform float uTime, uSpeed; uniform vec3 uDir; varying float vA;
      void main(){ float life = fract(aPhase + uTime * 1.4); float tt = life * 0.9;
        vec3 p = position * (1.0 + life * 3.0) + uDir * uSpeed * tt + vec3(0.0, -9.8 * 0.5 * tt * tt, 0.0);
        vA = 1.0 - life; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 0.5 * (300.0 / -mv.z) * (0.6 + life); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uOn; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA * uOn; if (a < 0.02) discard; gl_FragColor = vec4(0.65, 0.85, 1.0, a); }`,
  });
  const pts = new THREE.Points(geo, m) as unknown as THREE.Points & { update(t: number, dir: THREE.Vector3, on: number): void }; pts.frustumCulled = false; pts.userData.noCollide = true;
  pts.update = (t, dir, on) => { pts.visible = on > 0.01; m.uniforms.uTime.value = t; m.uniforms.uDir.value.copy(dir).normalize(); m.uniforms.uOn.value = on; };
  return pts;
}
