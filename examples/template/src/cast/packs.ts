// Whole Roblox packs (npm run pack: bundles or single assets by id, from the shared cache) loaded for the video:
//   const packs = usePacks();                   // undefined while loading, {} when there are none
//   const rig = rigFromPack(packs.boy, { outline: 0.035 });   // body parts, head, accessories, clothing
//   poseAt(rig, [{ clip: packs.boy.clip("idle") ?? clips.idle }], t)
// Everything is loaded before the canvas mounts. Missing files are left out, not errors.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile, cancelRender } from "remotion";
import { loadPack, fileKey, type LoadedPack, type Pack } from "blockrig/pack";

export type Packs = Record<string, LoadedPack>;

const image = (path: string) => new Promise<HTMLImageElement | null>((ok) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = staticFile(path); });

async function load(): Promise<Packs> {
  const res = await fetch(staticFile("roblox/packs/index.json"));
  if (!res.ok) return {};
  const index: Record<string, string> = await res.json(), out: Packs = {};
  await Promise.all(Object.entries(index).map(async ([name, key]) => {
    const pack: Pack = await (await fetch(staticFile(`roblox/packs/${key}/pack.json`))).json();
    const file = (id: number, format: string | null = null) => `roblox/packs/${key}/${fileKey(id, format).replace(/[^\w@.-]/g, "_")}`;
    out[name] = await loadPack(pack, {
      bytes: async (id, format) => new Uint8Array(await (await fetch(staticFile(file(id, format)))).arrayBuffer()),
      image: (id) => image(file(id)),
    });
  }));
  return out;
}

/** The packs in assets/roblox/packs (npm run pack). Holds the render until they are loaded. */
export function usePacks(): Packs | undefined {
  const [packs, setPacks] = useState<Packs | undefined>(undefined);
  const [handle] = useState(() => delayRender("Loading Roblox packs"));
  useEffect(() => { load().then((p) => { setPacks(p); continueRender(handle); }).catch((e) => cancelRender(e)); }, [handle]);
  return packs;
}
