// The environment: a summer park that snows over, and a suburban street to school. Built from CC0 Kenney
// models, Roblox-style parts and code (instancing, particles). Everything is a pure function of `time`.
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Assets } from "./lib/assets";
import { rng, lerp } from "./lib/rng";
import { PLINTH, STREET_X, SCHOOL_Z } from "./layout";

const col = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const clone = (g: THREE.Group, s: number, x: number, y: number, z: number, ry = 0) => { const c = g.clone(true); c.scale.setScalar(s); c.position.set(x, y, z); c.rotation.y = ry; return c; };
const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
function part(w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, ry = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = true; b.receiveShadow = true; return b;
}
function signTexture(text: string) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = "#1d3557"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#f1faee"; g.font = "800 150px Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 512, 138);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function World({ assets, time, snowFall, cover, focus }: { assets: Assets; time: number; snowFall: number; cover: number; focus: THREE.Vector3 }) {
  const { scene, gl, camera } = useThree();
  const M = assets.models;

  // ---- static content, built once ----
  const built = useMemo(() => {
    const root = new THREE.Group(), r = rng(42);
    const grassMat = mat("#5fb34a"), pathMat = mat("#d9c7a3"), stone = mat("#9aa3ad", { roughness: 0.95 }), wood = mat("#8a5a3b"), iron = mat("#2f3640", { metalness: 0.4, roughness: 0.5 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), grassMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);

    // --- park: cross paths, ring path, plinth, benches, lamps, flower beds, trees, fountain
    const park = new THREE.Group(); root.add(park);
    park.add(part(4, 0.06, 90, 0, 0.03, 0, pathMat), part(90, 0.06, 4, 0, 0.03, 0, pathMat));
    const ring = new THREE.Mesh(new THREE.RingGeometry(13, 16, 64), pathMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.receiveShadow = true; park.add(ring);
    park.add(part(PLINTH.size + 1, 0.3, PLINTH.size + 1, 0, 0.15, 0, stone), part(PLINTH.size, PLINTH.height - 0.3, PLINTH.size, 0, 0.3 + (PLINTH.height - 0.3) / 2, 0, mat("#b8c0c8")));
    const plaque = part(3.4, 0.9, 0.12, 0, 0.62, PLINTH.size / 2 + 0.06, mat("#c9a227", { metalness: 0.6, roughness: 0.35 })); park.add(plaque);
    const lamps: THREE.Object3D[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = Math.sin(a) * 19, z = Math.cos(a) * 19;
      const bench = new THREE.Group(); bench.position.set(x, 0, z); bench.rotation.y = a + Math.PI;
      bench.add(part(4.2, 0.25, 1.3, 0, 1.2, 0, wood), part(4.2, 1.1, 0.22, 0, 1.85, 0.6, wood), part(0.25, 1.2, 1.2, -1.8, 0.6, 0, iron), part(0.25, 1.2, 1.2, 1.8, 0.6, 0, iron));
      park.add(bench);
      const lamp = new THREE.Group(); lamp.position.set(Math.sin(a + 0.18) * 17, 0, Math.cos(a + 0.18) * 17);
      lamp.add(part(0.35, 7, 0.35, 0, 3.5, 0, iron), part(1.1, 0.9, 1.1, 0, 7.3, 0, mat("#fff3c4", { emissive: new THREE.Color("#ffd27a"), emissiveIntensity: 1.6 })));
      park.add(lamp); lamps.push(lamp);
    }
    const flowers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat("#ffffff"), 900);
    const palette = ["#ff5d8f", "#ffd166", "#f78c6b", "#c77dff", "#ffffff", "#ef476f"];
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 900; i++) {
      const bed = i % 6, a = (bed / 6) * Math.PI * 2 + 0.25, cx = Math.sin(a) * 24, cz = Math.cos(a) * 24;
      m4.makeTranslation(cx + (r() - 0.5) * 7, 0.35 + r() * 0.3, cz + (r() - 0.5) * 3.5); flowers.setMatrixAt(i, m4); flowers.setColorAt(i, new THREE.Color(palette[Math.floor(r() * palette.length)]));
    }
    flowers.castShadow = true; park.add(flowers);
    const grassTufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.9, 4), mat("#4f9d3a"), 2500);
    for (let i = 0; i < 2500; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 60; m4.makeTranslation(Math.sin(a) * d, 0.45, Math.cos(a) * d); grassTufts.setMatrixAt(i, m4); }
    park.add(grassTufts);
    const trees: THREE.Object3D[] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + r() * 0.2, d = 34 + r() * 14;
      const t = clone(r() < 0.5 ? M.trees : M.treesTall, 9 + r() * 4, Math.sin(a) * d, 0, Math.cos(a) * d, r() * 6); park.add(t); trees.push(t);
    }
    park.add(clone(M.fountain, 12, -30, 0, -22, 0.4));

    // --- street to school (far from the park)
    const street = new THREE.Group(); street.position.x = STREET_X; root.add(street);
    for (let z = -60; z <= 90; z += 12) street.add(clone(z % 24 === 0 ? M.road : M.roadPlain, 12, 0, 0.02, z, 0));
    street.add(part(7, 0.3, 160, 9.5, 0.15, 15, mat("#c8c8c8")), part(7, 0.3, 160, -9.5, 0.15, 15, mat("#c8c8c8")));
    const houses = [M.houseA, M.houseB, M.houseC, M.houseD, M.garage];
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1, z = 70 - Math.floor(i / 2) * 26;
      street.add(clone(houses[i % houses.length], 13, side * 26, 0, z, side > 0 ? -Math.PI / 2 : Math.PI / 2));
      const tree = clone(M.treesTall, 10, side * 38, 0, z - 12, r() * 6); street.add(tree); trees.push(tree);
      street.add(part(0.4, 1.4, 22, side * 15, 0.7, z, mat("#f4f1de")));
    }
    // school: parts building with a sign
    const school = new THREE.Group(); school.position.set(0, 0, SCHOOL_Z); street.add(school);
    const brick = mat("#b5473a"), trim = mat("#f4f1de"), glass = mat("#9fd3f0", { metalness: 0.3, roughness: 0.15, emissive: new THREE.Color("#264653"), emissiveIntensity: 0.15 });
    school.add(part(52, 17, 16, 0, 8.5, -8, brick), part(54, 1.2, 18, 0, 17.6, -8, trim), part(20, 6, 14, 0, 21, -8, brick), part(22, 1, 16, 0, 24.5, -8, trim));
    school.add(part(7, 9, 0.6, 0, 4.5, 0.1, mat("#2b2d42")), part(9, 1, 1.5, 0, 9.5, 0.6, trim));
    for (const x of [-20, -13, 13, 20]) for (const y of [5, 12]) school.add(part(4.2, 4, 0.4, x, y, 0.1, glass));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), new THREE.MeshStandardMaterial({ map: signTexture("SCHOOL"), roughness: 0.6 })); sign.position.set(0, 13.6, 0.45); school.add(sign);
    school.add(clone(M.flag, 10, 18, 0, 10, 0));

    // clouds
    const clouds: THREE.Object3D[] = [];
    for (let i = 0; i < 14; i++) { const c = clone(M.cloud, 14 + r() * 10, (r() - 0.5) * 500, 55 + r() * 25, (r() - 0.5) * 500); clouds.push(c); root.add(c); }

    root.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ground.castShadow = false;
    return { root, ground, grassMat, pathMat, grassTufts, trees, clouds, palette, lamps };
  }, [M]);

  // image-based lighting from the HDRI (once)
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromEquirectangular(assets.hdri).texture;
    pm.dispose();
  }, [gl, scene, assets.hdri]);

  // ---- per frame: snow cover, mood, wind, clouds ----
  built.grassMat.color.copy(col("#5fb34a", "#eef6fb", cover));
  built.pathMat.color.copy(col("#d9c7a3", "#f4f8fb", cover * 0.9));
  (built.grassTufts.material as THREE.MeshStandardMaterial).color.copy(col("#4f9d3a", "#dfeef6", cover));
  built.trees.forEach((t, i) => { t.rotation.z = Math.sin(time * 1.3 + i * 1.7) * 0.025 * (1 - snowFall * 0.5); });
  built.clouds.forEach((c, i) => { c.position.x = ((((i * 97) % 500) - 250 + time * (2 + (i % 3))) % 500 + 750) % 500 - 250; });
  // a lamp post standing between the camera and what it looks at is hidden for that frame, like a game
  // camera fading props near the lens
  built.lamps.forEach((l) => {
    const cx = camera.position.x, cz = camera.position.z, dx = focus.x - cx, dz = focus.z - cz, len2 = dx * dx + dz * dz || 1;
    const t = ((l.position.x - cx) * dx + (l.position.z - cz) * dz) / len2;
    const px = cx + dx * t - l.position.x, pz = cz + dz * t - l.position.z;
    l.visible = !(t > 0 && t < 1 && px * px + pz * pz < 2.5 * 2.5);
  });
  scene.background = col("#9fd3ff", "#b9c6d3", snowFall);
  scene.fog = new THREE.Fog(col("#f6d7b0", "#d5dee8", snowFall).getHex(), lerp(90, 55, snowFall), lerp(420, 230, snowFall));
  scene.environmentIntensity = lerp(0.9, 0.7, snowFall);

  const sunCol = col("#ffd8a8", "#e3ecf5", snowFall);
  return (
    <>
      <primitive object={built.root} />
      <hemisphereLight args={[col("#bfe3ff", "#dfe8f0", snowFall), col("#5d7a3a", "#c9d3dc", cover), lerp(0.55, 0.75, snowFall)]} />
      <directionalLight
        color={sunCol} intensity={lerp(2.6, 1.4, snowFall)} castShadow
        position={[focus.x + 40, 60, focus.z + 30]} target-position={[focus.x, 0, focus.z]}
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-near={1} shadow-camera-far={200}
      />
      <Snow time={time} amount={snowFall} focus={focus} />
    </>
  );
}

// falling snow around the camera's focus; positions are a pure function of time
const N = 4500;
function Snow({ time, amount, focus }: { time: number; amount: number; focus: THREE.Vector3 }) {
  const pts = useMemo(() => {
    const g = new THREE.BufferGeometry(), r = rng(9), seed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { seed[i * 4] = r(); seed[i * 4 + 1] = r(); seed[i * 4 + 2] = r(); seed[i * 4 + 3] = r(); }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const tex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d")!; const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const m = new THREE.PointsMaterial({ size: 0.32, map: tex, transparent: true, depthWrite: false, color: "#ffffff" });
    const p = new THREE.Points(g, m); p.frustumCulled = false;
    return { p, seed };
  }, []);
  const pos = pts.p.geometry.attributes.position as THREE.BufferAttribute, S = pts.seed, H = 34, W = 70;
  const visible = Math.floor(N * amount);
  for (let i = 0; i < N; i++) {
    if (i >= visible) { pos.setXYZ(i, 0, -999, 0); continue; }
    const fall = 2.2 + S[i * 4 + 3] * 1.6, y = H - ((S[i * 4 + 1] * H + time * fall) % H);
    const x = focus.x + (S[i * 4] - 0.5) * W + Math.sin(time * 0.8 + i) * 0.6, z = focus.z + (S[i * 4 + 2] - 0.5) * W;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  (pts.p.material as THREE.PointsMaterial).opacity = Math.min(1, amount * 1.4);
  return <primitive object={pts.p} />;
}
