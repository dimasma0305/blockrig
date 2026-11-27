// Roblox catalog items (used by default once downloaded; Roblox allows them in videos; the files stay out of git): dynamic heads with
// FACS expressions, hair accessories, classic shirts and pants, fetched by `npm run roblox` into assets/roblox/
// (git-ignored) and described in assets/roblox/cast.json. Everything is loaded before the canvas mounts.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile, cancelRender } from "remotion";
import * as THREE from "three";
import { parseMesh, parseRbxm, keyframeSequenceToClip } from "blockrig";
import type { MapData } from "../kit/robloxMap";

export type RobloxHead = { mesh: any; map: THREE.Texture | null; size: number[]; attachments: Record<string, number[]>; mood: any | null };
export type RobloxHair = { mesh: any; map: THREE.Texture | null; attachment: { name: string; cframe: any }; plate?: string | null; scale?: number[]; offset?: number[] };
export type RobloxMapItem = { data: MapData; meshes: Record<string, any>; images: Record<string, HTMLImageElement> };
export type RobloxCast = { heads: Record<string, RobloxHead>; hair: Record<string, RobloxHair>; faces: Record<string, RobloxHair>; clothing: Record<string, HTMLImageElement>; maps: Record<string, RobloxMapItem> };

const bytes = async (path: string) => new Uint8Array(await (await fetch(staticFile(path))).arrayBuffer());
const image = (path: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => fail(new Error(`roblox item ${path} is missing: run npm run roblox`)); i.src = staticFile(path); });
const texture = async (path: string | null) => { if (!path) return null; const t = new THREE.Texture(await image(path)); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.needsUpdate = true; return t; };
// Face accessories are drawn exactly as Roblox draws them (the texture untouched). Many paint a face plate in the skin
// tone they were made for (catalog items come in "White", "Light"... versions): in Roblox the player wears the face
// that matches their skin, or sets their skin to match. We measure that plate colour so the cast can do the same.
async function faceItem(c: any) {
  const img = await image(c.texture), cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext("2d")!; g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, cv.width, cv.height).data, light: number[][] = []; let opaque = 0;
  for (let i = 0; i < px.length; i += 16) { // every 4th texel is plenty
    if (px[i + 3] < 200) continue; opaque++;
    const r = px[i], gg = px[i + 1], b = px[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx > 150 && (mx - mn) / mx < 0.42 && r >= b) light.push([r, gg, b]); // skin tones, white to tan
  }
  let plate: string | null = null;
  if (light.length > opaque * 0.25) { // a real plate, not a few highlights
    const med = (k: number) => light.map((v) => v[k]).sort((x, y) => x - y)[light.length >> 1];
    plate = "#" + [med(0), med(1), med(2)].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.needsUpdate = true;
  return { mesh: parseMesh(await bytes(c.mesh)), map: t, attachment: c.attachment, plate, scale: c.scale, offset: c.offset };
}

async function load(): Promise<RobloxCast> {
  const res = await fetch(staticFile("roblox/cast.json"));
  if (!res.ok) throw new Error("assets/roblox/cast.json is missing: run npm run roblox (Roblox items) or render with --no-roblox");
  const cast = await res.json(), out: RobloxCast = { heads: {}, hair: {}, faces: {}, clothing: {}, maps: {} };
  await Promise.all(Object.entries<any>(cast).map(async ([name, c]) => {
    if (c.kind === "head") {
      let mood = null;
      if (c.mood) { try { mood = keyframeSequenceToClip(parseRbxm(await bytes(c.mood))); } catch { mood = null; } }
      out.heads[name] = { mesh: parseMesh(await bytes(c.mesh)), map: await texture(c.texture), size: c.size, attachments: c.attachments, mood };
    } else if (c.kind === "map") {
      // maps (houses, rooms, streets from the Toolbox): a missing mesh or image is skipped, not an error
      const meshes: Record<string, any> = {}, images: Record<string, HTMLImageElement> = {};
      await Promise.all([
        ...Object.entries<string>(c.meshes).map(async ([id, f]) => { try { meshes[id] = parseMesh(await bytes(f)); } catch { /* old or odd mesh */ } }),
        ...Object.entries<string>(c.images).map(async ([id, f]) => { try { images[id] = await image(f); } catch { /* not an image */ } }),
      ]);
      out.maps[name] = { data: await (await fetch(staticFile(c.data))).json(), meshes, images };
    } else if (c.kind === "shirt" || c.kind === "pants") out.clothing[name] = await image(c.template);
    else if (c.kind === "face") out.faces[name] = await faceItem(c);
    else out.hair[name] = { mesh: parseMesh(await bytes(c.mesh)), map: await texture(c.texture), attachment: c.attachment, scale: c.scale, offset: c.offset };
  }));
  return out;
}

/** The Roblox items, or null when `enabled` is false. Holds the render until they are loaded. */
export function useRobloxCast(enabled: boolean): RobloxCast | null | undefined {
  const [cast, setCast] = useState<RobloxCast | null | undefined>(enabled ? undefined : null);
  const [handle] = useState(() => (enabled ? delayRender("Loading Roblox items") : null));
  useEffect(() => {
    if (!enabled || handle === null) return;
    load().then((c) => { setCast(c); continueRender(handle); }).catch((e) => cancelRender(e));
  }, [enabled, handle]);
  return cast;
}
