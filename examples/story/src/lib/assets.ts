// Load every model and the HDRI before the canvas mounts, holding the render with delayRender, so no model
// can appear in some frames and not others.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export const MODELS = {
  houseA: "cc0/kenney-city/building-small-a.glb",
  houseB: "cc0/kenney-city/building-small-b.glb",
  houseC: "cc0/kenney-city/building-small-c.glb",
  houseD: "cc0/kenney-city/building-small-d.glb",
  garage: "cc0/kenney-city/building-garage.glb",
  trees: "cc0/kenney-city/grass-trees.glb",
  treesTall: "cc0/kenney-city/grass-trees-tall.glb",
  fountain: "cc0/kenney-city/pavement-fountain.glb",
  road: "cc0/kenney-city/road-straight-lightposts.glb",
  roadPlain: "cc0/kenney-city/road-straight.glb",
  cloud: "cc0/kenney-platformer/cloud.glb",
  flag: "cc0/kenney-platformer/flag.glb",
} as const;
export const HDRI = "cc0/polyhaven/evening_meadow_1k.hdr";

export type Assets = { models: Record<keyof typeof MODELS, THREE.Group>; hdri: THREE.DataTexture };

let cache: Promise<Assets> | null = null;
function loadAll(): Promise<Assets> {
  if (cache) return cache;
  const gltf = new GLTFLoader();
  const entries = Object.entries(MODELS).map(async ([k, url]) => {
    const g = await gltf.loadAsync(staticFile(url));
    g.scene.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return [k, g.scene] as const;
  });
  cache = Promise.all([Promise.all(entries), new HDRLoader().loadAsync(staticFile(HDRI))]).then(([m, hdri]) => {
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    return { models: Object.fromEntries(m) as Assets["models"], hdri };
  });
  return cache;
}

export function useAssets(): Assets | null {
  const [assets, setAssets] = useState<Assets | null>(null);
  const [handle] = useState(() => delayRender("Loading models and HDRI"));
  useEffect(() => {
    loadAll().then((a) => { setAssets(a); continueRender(handle); }).catch((e) => { console.error(e); throw e; });
  }, [handle]);
  return assets;
}
