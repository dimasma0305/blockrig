// Roblox catalog items for LOCAL videos (render with --roblox; never commit or publish them): dynamic heads with
// FACS expressions, hair accessories, classic shirts and pants, fetched by `npm run roblox` into assets/roblox/
// (git-ignored) and described in assets/roblox/cast.json. Everything is loaded before the canvas mounts.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile, cancelRender } from "remotion";
import * as THREE from "three";
import { parseMesh, parseRbxm, keyframeSequenceToClip } from "blockrig";

export type RobloxHead = { mesh: any; map: THREE.Texture | null; size: number[]; attachments: Record<string, number[]>; mood: any | null };
export type RobloxHair = { mesh: any; map: THREE.Texture | null; attachment: { name: string; cframe: any } };
export type RobloxCast = { heads: Record<string, RobloxHead>; hair: Record<string, RobloxHair>; clothing: Record<string, HTMLImageElement> };

const bytes = async (path: string) => new Uint8Array(await (await fetch(staticFile(path))).arrayBuffer());
const image = (path: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => fail(new Error(`roblox item ${path} is missing: run npm run roblox`)); i.src = staticFile(path); });
const texture = async (path: string | null) => { if (!path) return null; const t = new THREE.Texture(await image(path)); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.needsUpdate = true; return t; };

async function load(): Promise<RobloxCast> {
  const res = await fetch(staticFile("roblox/cast.json"));
  if (!res.ok) throw new Error("assets/roblox/cast.json is missing: run npm run roblox (local Roblox items) or render without --roblox");
  const cast = await res.json(), out: RobloxCast = { heads: {}, hair: {}, clothing: {} };
  await Promise.all(Object.entries<any>(cast).map(async ([name, c]) => {
    if (c.kind === "head") {
      let mood = null;
      if (c.mood) { try { mood = keyframeSequenceToClip(parseRbxm(await bytes(c.mood))); } catch { mood = null; } }
      out.heads[name] = { mesh: parseMesh(await bytes(c.mesh)), map: await texture(c.texture), size: c.size, attachments: c.attachments, mood };
    } else if (c.kind === "shirt" || c.kind === "pants") out.clothing[name] = await image(c.template);
    else out.hair[name] = { mesh: parseMesh(await bytes(c.mesh)), map: await texture(c.texture), attachment: c.attachment };
  }));
  return out;
}

/** The local Roblox items, or null when `enabled` is false. Holds the render until they are loaded. */
export function useRobloxCast(enabled: boolean): RobloxCast | null | undefined {
  const [cast, setCast] = useState<RobloxCast | null | undefined>(enabled ? undefined : null);
  const [handle] = useState(() => (enabled ? delayRender("Loading local Roblox items") : null));
  useEffect(() => {
    if (!enabled || handle === null) return;
    load().then((c) => { setCast(c); continueRender(handle); }).catch((e) => cancelRender(e));
  }, [enabled, handle]);
  return cast;
}
