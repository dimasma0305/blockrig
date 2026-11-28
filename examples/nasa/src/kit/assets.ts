// Downloaded assets in the scene (assets first: see the assets skill). Everything a video uses is listed once,
// loaded before the first frame (delayRender holds the render), then placed by name:
//   const lib = useAssetLibrary(ASSETS)            // in the R3F tree; null until loaded
//   lib.model("house", { height: 18 })            // a clone, scaled to studs, with shadows
//   lib.pose(obj, "Walk", seconds)                 // frame-pure glTF animation (no mixer time carried over)
//   lib.sky("day")                                 // HDRI texture for scene.background / environment
//   lib.pbr("asphalt", { repeat: [4, 40] })        // MeshStandardMaterial from a PBR set (diff, rough, nor_gl)
// Paths are relative to assets/ (the Remotion public folder). A missing file says which `npm run assets` to run.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile, cancelRender } from "remotion";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export type AssetList = {
  models?: Record<string, string>;                     // name -> "kenney/city-kit-suburban/building-type-a.glb"
  skies?: Record<string, string>;                      // name -> "hdri/day.hdr"
  pbr?: Record<string, string>;                        // name -> "textures/asphalt" (folder with diff/rough/nor_gl.jpg)
};
export type FitOpts = { scale?: number; height?: number; width?: number; length?: number; shadows?: boolean; receive?: boolean; center?: boolean };

export type AssetLibrary = {
  gltf: Record<string, GLTF>;
  model(name: string, o?: FitOpts): THREE.Object3D;
  /** Pose a model's glTF animation at `seconds` (looped), frame-pure: a fresh mixer state every call. */
  pose(obj: THREE.Object3D, clip: string, seconds: number, loop?: boolean): void;
  clips(name: string): string[];
  sky(name: string): THREE.Texture;
  pbr(name: string, o?: { repeat?: [number, number]; color?: THREE.ColorRepresentation; roughness?: number }): THREE.MeshStandardMaterial;
};

const cache = new Map<string, Promise<any>>();
const once = <T,>(key: string, f: () => Promise<T>): Promise<T> => { if (!cache.has(key)) cache.set(key, f()); return cache.get(key)!; };
const hint = (path: string) => `asset "${path}" is missing: run npm run assets (see assets/manifest.json and the assets skill)`;

async function loadAll(list: AssetList) {
  const gltfLoader = new GLTFLoader(), hdr = new HDRLoader(), tex = new THREE.TextureLoader();
  const gltf: Record<string, GLTF> = {}, skies: Record<string, THREE.Texture> = {}, pbr: Record<string, Record<string, THREE.Texture>> = {};
  const jobs: Promise<void>[] = [];
  for (const [name, path] of Object.entries(list.models ?? {})) jobs.push(once(`m:${path}`, () => gltfLoader.loadAsync(staticFile(path)).catch(() => { throw new Error(hint(path)); })).then((g) => { gltf[name] = g; }));
  for (const [name, path] of Object.entries(list.skies ?? {})) jobs.push(once(`s:${path}`, () => hdr.loadAsync(staticFile(path)).catch(() => { throw new Error(hint(path)); })).then((t: THREE.DataTexture) => { t.mapping = THREE.EquirectangularReflectionMapping; skies[name] = t; }));
  for (const [name, dir] of Object.entries(list.pbr ?? {})) {
    pbr[name] = {};
    for (const map of ["diff", "rough", "nor_gl"]) jobs.push(once(`t:${dir}/${map}`, () => tex.loadAsync(staticFile(`${dir}/${map}.jpg`)).catch(() => { throw new Error(hint(`${dir}/${map}.jpg`)); })).then((t: THREE.Texture) => { pbr[name][map] = t; }));
  }
  await Promise.all(jobs);
  return { gltf, skies, pbr };
}

function fit(obj: THREE.Object3D, o: FitOpts) {
  if (o.scale) obj.scale.setScalar(o.scale);
  else if (o.height || o.width || o.length) {
    const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    const k = o.height ? o.height / size.y : o.width ? o.width / size.x : o.length! / size.z;
    obj.scale.multiplyScalar(k);
  }
  // sit on the ground (lowest point at y = 0) and, unless center: false, centre the footprint on the origin
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group(); obj.position.y -= box.min.y;
  if (o.center !== false) { obj.position.x -= c.x; obj.position.z -= c.z; }
  wrap.add(obj); wrap.name = obj.name || "asset"; wrap.userData.size = box.getSize(new THREE.Vector3());
  return wrap;
}

export function useAssetLibrary(list: AssetList): AssetLibrary | null {
  const [lib, setLib] = useState<AssetLibrary | null>(null);
  const [handle] = useState(() => delayRender("Loading downloaded assets"));
  useEffect(() => {
    loadAll(list).then(({ gltf, skies, pbr }) => {
      const mixers = new WeakMap<THREE.Object3D, { mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction> }>();
      setLib({
        gltf,
        model(name, o = {}) {
          const g = gltf[name]; if (!g) throw new Error(`model "${name}" is not in the asset list`);
          const obj = (g.animations.length ? SkeletonUtils.clone(g.scene) : g.scene.clone(true)) as THREE.Object3D;
          obj.userData.asset = name;
          obj.traverse((c: any) => { if (c.isMesh) { c.castShadow = o.shadows ?? true; c.receiveShadow = o.receive ?? true; } });
          const w = fit(obj, o); w.userData.asset = name; w.userData.inner = obj; return w;
        },
        clips: (name) => (gltf[name]?.animations ?? []).map((a) => a.name),
        pose(obj, clip, seconds, loop = true) {
          const inner = obj.userData.inner ?? obj, g = gltf[obj.userData.asset];
          if (!g) return;
          let m = mixers.get(inner);
          if (!m) { m = { mixer: new THREE.AnimationMixer(inner), actions: new Map() }; mixers.set(inner, m); }
          const anim = g.animations.find((a) => a.name === clip || a.name.endsWith(`|${clip}`));
          if (!anim) throw new Error(`no animation "${clip}" in ${obj.userData.asset} (${g.animations.map((a) => a.name).join(", ")})`);
          for (const [n, a] of m.actions) if (n !== anim.name) a.stop();
          let a = m.actions.get(anim.name); if (!a) { a = m.mixer.clipAction(anim); m.actions.set(anim.name, a); }
          a.play(); a.time = loop ? seconds % anim.duration : Math.min(seconds, anim.duration - 1e-3);
          m.mixer.update(0);
        },
        sky(name) { const s = skies[name]; if (!s) throw new Error(`sky "${name}" is not in the asset list`); return s; },
        pbr(name, o = {}) {
          const t = pbr[name]; if (!t) throw new Error(`texture set "${name}" is not in the asset list`);
          const rep = o.repeat ?? [1, 1];
          const prep = (x: THREE.Texture, srgb: boolean) => { const c = x.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rep[0], rep[1]); c.anisotropy = 8; if (srgb) c.colorSpace = THREE.SRGBColorSpace; c.needsUpdate = true; return c; };
          return new THREE.MeshStandardMaterial({ map: prep(t.diff, true), roughnessMap: t.rough ? prep(t.rough, false) : null, normalMap: t.nor_gl ? prep(t.nor_gl, false) : null, color: o.color ?? 0xffffff, roughness: o.roughness ?? 1 });
        },
      });
      continueRender(handle);
    }).catch((e) => cancelRender(e));
  }, [handle]);
  return lib;
}
