// Shaders and effects for the neon world. Every effect is a pure function of time (uniform uTime or values set
// from the current frame), so Remotion can render any frame on its own.
import * as THREE from "three";
import { rng } from "../kit/rng";

const FOG = { uFogColor: { value: new THREE.Color("#0a0f24") }, uFogNear: { value: 40 }, uFogFar: { value: 260 } };
const fogGLSL = `uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; varying float vDepth;
vec3 fogged(vec3 c) { return mix(c, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)); }`;
export function setFog(near: number, far: number, colour: string) { FOG.uFogNear.value = near; FOG.uFogFar.value = far; FOG.uFogColor.value.set(colour); }

// ---- skyscrapers: dark glass with procedural lit windows (hash per window cell), unlit + fog ----
export function towerMaterial(seed: number, tint = "#1a2140") {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uTint: { value: new THREE.Color(tint) }, ...FOG },
    vertexShader: `varying vec3 vWorld; varying vec3 vNormal; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform float uSeed; uniform vec3 uTint; varying vec3 vWorld; varying vec3 vNormal; ${fogGLSL}
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed*13.7) * 43758.5453); }
      void main(){
        vec3 n = abs(vNormal); vec3 c = uTint * (0.35 + 0.25 * vNormal.y);
        if (n.y < 0.5) {
          vec2 uv = vec2(n.x > n.z ? vWorld.z : vWorld.x, vWorld.y) / vec2(1.3, 1.7);
          vec2 cell = floor(uv), f = fract(uv);
          float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.78);
          float r = h(cell), lit = step(0.52, r) * step(2.0, vWorld.y);
          float flick = 0.85 + 0.15 * sin(uTime * (2.0 + r * 9.0) + r * 40.0);
          vec3 lc = r > 0.9 ? vec3(0.2,0.95,1.0) : r > 0.8 ? vec3(1.0,0.25,0.65) : vec3(1.0,0.78,0.45);
          c += win * lit * lc * 1.6 * flick;
          c += vec3(0.05,0.08,0.18) * (1.0 - win) * step(0.5, fract(vWorld.y * 0.05));
        }
        gl_FragColor = vec4(fogged(c), 1.0);
      }`,
  });
}

// ---- the firewall dome: hex grid + fresnel rim + scan band + impact ripples + shatter dissolve ----
export function domeMaterial(colour = "#19e3c4") {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(colour) }, uHit: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, -99)) }, uShatter: { value: 0 }, uFlicker: { value: 0 }, uAlarm: { value: 0 } },
    vertexShader: `varying vec3 vPos; varying vec3 vNormal; varying vec3 vView; varying vec3 vWorld;
      void main(){ vPos = position; vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; vNormal = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform vec4 uHit[8]; uniform float uShatter; uniform float uFlicker; uniform float uAlarm;
      varying vec3 vPos; varying vec3 vNormal; varying vec3 vView; varying vec3 vWorld;
      vec2 hexCell(vec2 p){ vec2 r = vec2(1.0, 1.7320508); vec2 h = r*0.5; vec2 a = mod(p, r) - h; vec2 b = mod(p - h, r) - h; return dot(a,a) < dot(b,b) ? p - a : p - b; }
      float hexEdge(vec2 p){ vec2 r = vec2(1.0, 1.7320508); vec2 h = r*0.5; vec2 a = mod(p, r) - h; vec2 b = mod(p - h, r) - h; vec2 g = dot(a,a) < dot(b,b) ? a : b;
        g = abs(g); return max(dot(g, normalize(vec2(1.0,1.7320508))), g.x); }
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vPos); vec2 sph = vec2(atan(d.x, d.z) * 4.0, d.y * 7.0) * 1.8;
        vec2 cell = hexCell(sph); float e = hexEdge(sph);
        float edge = smoothstep(0.40, 0.47, e);
        float fres = pow(1.0 - abs(dot(normalize(vNormal), vView)), 2.5);
        float scan = smoothstep(0.08, 0.0, abs(fract(d.y * 1.5 - uTime * 0.35) - 0.5) - 0.42);
        float ripple = 0.0;
        for (int i = 0; i < 8; i++) { float age = uTime - uHit[i].w; if (age < 0.0 || age > 1.2) continue;
          float dist = distance(vWorld, uHit[i].xyz); ripple += smoothstep(0.9, 0.0, abs(dist - age * 22.0)) * (1.0 - age / 1.2) + smoothstep(3.0, 0.0, dist) * (1.0 - age / 1.2) * 2.0; }
        float gone = step(rnd(cell), uShatter);
        if (gone > 0.5) discard;
        float cellGlow = 0.10 + 0.25 * rnd(cell + floor(uTime * 3.0)) * uFlicker;
        vec3 col = mix(uColor, vec3(1.0, 0.15, 0.3), uAlarm);
        float a = edge * 0.55 + fres * 0.9 + scan * 0.25 + cellGlow * 0.4 + ripple * 1.2;
        gl_FragColor = vec4(col * a, a);
      }`,
  });
}

// ---- hologram panel: a canvas texture with scanlines, flicker, glitch slices and an edge glow ----
export function hologramMaterial(map: THREE.Texture, colour = "#19e3c4") {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: map }, uColor: { value: new THREE.Color(colour) }, uGlitch: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; uniform sampler2D uMap; uniform vec3 uColor; uniform float uGlitch; uniform float uOpacity; varying vec2 vUv;
      float rnd(float x){ return fract(sin(x * 91.7) * 43758.5453); }
      void main(){
        vec2 uv = vUv; float band = floor(uv.y * 24.0 + floor(uTime * 12.0));
        uv.x += (rnd(band) - 0.5) * 0.08 * uGlitch * step(0.7, rnd(band + 3.0));
        vec4 t = texture2D(uMap, uv);
        float r = texture2D(uMap, uv + vec2(0.004 * (1.0 + uGlitch * 4.0), 0.0)).r, b = texture2D(uMap, uv - vec2(0.004 * (1.0 + uGlitch * 4.0), 0.0)).b;
        vec3 c = vec3(r, t.g, b);
        float scan = 0.75 + 0.25 * sin(vUv.y * 420.0 - uTime * 30.0);
        float flick = 0.88 + 0.12 * step(0.5, rnd(floor(uTime * 20.0)));
        float edge = smoothstep(0.03, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
        vec3 col = c * scan * flick + uColor * (edge * 0.9 + 0.06);
        float a = max(max(c.r, c.g), c.b) * scan + edge * 0.8 + 0.05;
        gl_FragColor = vec4(col * uOpacity, a * uOpacity);
      }`,
  });
}

// ---- glyph rain: a big panel where glyph columns fall (glyph atlas drawn in code) ----
export function glyphAtlas() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d")!;
  const glyphs = "01{}[]<>/$#%&*=+;:!?ABCDEFabcdef0x7F3A9CE2D4B8".split("");
  g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512); g.font = "bold 26px Consolas, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
  for (let i = 0; i < 256; i++) g.fillText(glyphs[i % glyphs.length], (i % 16) * 32 + 16, Math.floor(i / 16) * 32 + 17);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
}
export function glyphRainMaterial(atlas: THREE.Texture, colour = "#19e3c4") {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAtlas: { value: atlas }, uColor: { value: new THREE.Color(colour) }, uCols: { value: 90 }, uOpacity: { value: 0.55 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; uniform sampler2D uAtlas; uniform vec3 uColor; uniform float uCols; uniform float uOpacity; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 grid = vec2(uCols, uCols * 0.9); vec2 p = vUv * grid; vec2 cell = floor(p); vec2 f = fract(p);
        float speed = 2.0 + rnd(vec2(cell.x, 1.0)) * 5.0, head = fract(-uTime * speed / grid.y + rnd(vec2(cell.x, 7.0)));
        float y = vUv.y, trail = fract(y - head); float lum = smoothstep(0.35, 0.0, trail) ;
        float gi = floor(rnd(cell + floor(uTime * (1.0 + rnd(cell) * 3.0))) * 256.0);
        vec2 auv = (vec2(mod(gi, 16.0), floor(gi / 16.0)) + f) / 16.0; auv.y = 1.0 - auv.y;
        float glyph = texture2D(uAtlas, vec2(auv.x, auv.y)).r;
        vec3 col = mix(uColor, vec3(1.0), smoothstep(0.03, 0.0, trail)) * glyph * lum;
        float fade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        gl_FragColor = vec4(col * uOpacity * fade, glyph * lum * uOpacity * fade);
      }`,
  });
}

// ---- packet beam: a thin cylinder from A to B with dashes running along it ----
export function beam(colour: string, radius = 0.25) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(colour) }, uOn: { value: 0 }, uRainbow: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOn; uniform float uRainbow; varying vec2 vUv;
      vec3 hsv(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0, 0.0, 1.0); }
      void main(){
        float along = vUv.y; float dash = smoothstep(0.35, 0.0, abs(fract(along * 14.0 - uTime * 6.0) - 0.5));
        float core = 1.0 - abs(vUv.x - 0.5) * 2.0;
        vec3 col = mix(uColor, hsv(fract(along * 2.0 - uTime)), uRainbow);
        float reach = step(along, uOn);
        float a = (0.45 * core + dash * 0.9) * reach;
        gl_FragColor = vec4(col * a * 1.6, a);
      }`,
  });
  const g = new THREE.CylinderGeometry(radius, radius, 1, 10, 1, true); g.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
  const up = new THREE.Vector3(0, 1, 0);
  mesh.userData.aim = (a: THREE.Vector3, b: THREE.Vector3) => { const d = b.clone().sub(a), len = d.length(); mesh.position.copy(a); mesh.quaternion.setFromUnitVectors(up, d.normalize()); mesh.scale.set(1, len, 1); };
  return mesh;
}

// ---- bursts: shader particles from (origin, velocity, birth) attributes; position = p0 + v t + g t^2 / 2 ----
export function burst(count: number, o: { origin: THREE.Vector3; speed: number; spread?: number; up?: number; gravity?: number; life: number; size: number; colours: string[]; seed: number; atlas?: THREE.Texture; birthSpread?: number }) {
  const r = rng(o.seed), pos = new Float32Array(count * 3), vel = new Float32Array(count * 3), birth = new Float32Array(count), col = new Float32Array(count * 3), glyph = new Float32Array(count);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(1 - 2 * r()) * (o.spread ?? 1), s = o.speed * (0.4 + r() * 0.8);
    vel.set([Math.sin(ph) * Math.cos(th) * s, Math.cos(ph) * s + (o.up ?? 0), Math.sin(ph) * Math.sin(th) * s], i * 3);
    pos.set([o.origin.x, o.origin.y, o.origin.z], i * 3); birth[i] = r() * (o.birthSpread ?? 0.15); glyph[i] = Math.floor(r() * 256);
    c.set(o.colours[i % o.colours.length]); c.toArray(col, i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aVel", new THREE.BufferAttribute(vel, 3)); g.setAttribute("aBirth", new THREE.BufferAttribute(birth, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3)); g.setAttribute("aGlyph", new THREE.BufferAttribute(glyph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uAge: { value: -1 }, uLife: { value: o.life }, uGravity: { value: o.gravity ?? -9.8 }, uSize: { value: o.size }, uAtlas: { value: o.atlas ?? null }, uGlyphs: { value: o.atlas ? 1 : 0 } },
    vertexShader: `attribute vec3 aVel; attribute float aBirth; attribute vec3 aColor; attribute float aGlyph; uniform float uAge; uniform float uLife; uniform float uGravity; uniform float uSize;
      varying vec3 vColor; varying float vFade; varying float vGlyph;
      void main(){ float t = uAge - aBirth; vFade = (t < 0.0 || t > uLife) ? 0.0 : 1.0 - t / uLife; t = max(t, 0.0);
        vec3 p = position + aVel * t + vec3(0.0, 0.5 * uGravity * t * t, 0.0); vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (300.0 / -mv.z) * (0.6 + 0.4 * vFade); gl_Position = projectionMatrix * mv; vColor = aColor; vGlyph = aGlyph; }`,
    fragmentShader: `uniform sampler2D uAtlas; uniform float uGlyphs; varying vec3 vColor; varying float vFade; varying float vGlyph;
      void main(){ if (vFade <= 0.0) discard; vec2 c = gl_PointCoord - 0.5; float a;
        if (uGlyphs > 0.5) { vec2 auv = (vec2(mod(vGlyph, 16.0), floor(vGlyph / 16.0)) + vec2(gl_PointCoord.x, gl_PointCoord.y)) / 16.0; auv.y = 1.0 - auv.y; a = texture2D(uAtlas, auv).r; }
        else a = smoothstep(0.5, 0.0, length(c));
        gl_FragColor = vec4(vColor * a * vFade * 1.5, a * vFade); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  pts.userData.at = (age: number) => { mat.uniforms.uAge.value = age; pts.visible = age >= 0 && age <= o.life + (o.birthSpread ?? 0.15); };
  pts.userData.at(-1);
  return pts;
}

// ---- soft glow sprite (fake bloom around neon sources) ----
let glowTex: THREE.Texture | null = null;
export function glow(colour: string, size: number, opacity = 0.8) {
  if (!glowTex) {
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: colour, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.set(size, size, 1); return s;
}

// ---- searchlight: an additive cone fading along its length ----
export function searchlight(colour = "#b8f3ff", length = 120, radius = 10) {
  const g = new THREE.ConeGeometry(radius, length, 24, 1, true); g.translate(0, -length / 2, 0); g.rotateX(Math.PI);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(colour) } },
    vertexShader: `varying float vAlong; void main(){ vAlong = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uColor; varying float vAlong; void main(){ float a = 0.10 * smoothstep(${length.toFixed(1)}, 0.0, vAlong); gl_FragColor = vec4(uColor * a, a); }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
}

/** set uTime on every shader material under a root */
export function tick(root: THREE.Object3D, time: number) {
  root.traverse((o: any) => { const m = o.material; if (m && m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = time; });
}
