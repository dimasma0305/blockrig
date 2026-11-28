// A disk cache for Roblox packs, shared by every video on the machine (Node only): bundle details and asset files
// are downloaded once and reused by id. Default folder: ~/.cache/blockrig/roblox (or BLOCKRIG_CACHE).
//   <cache>/bundles/<id>.json          catalog bundle details
//   <cache>/assets/<id>[@format]       asset files as delivered (ZSTD inflated, v7 Draco meshes stored as v4)
//   <cache>/links.json                 short-lived asset delivery links waiting to be downloaded
//
//   const cache = packCache();
//   let r = await fillPack("bundle:949", cache);           // downloads bundle details and every linked file
//   r.missing                                              // assets that need a link from the signed-in browser:
//   locateScript(r.missing)                                //   run this in the browser on a roblox.com page,
//   cache.addLinks(text)                                   //   give back what it returns, and fillPack again
//   exportPack(r.pack, cache, "assets/roblox/packs")       // copy the pack's files next to the video
//
// Asset delivery needs the user's own Roblox sign-in, so only the browser step can ask for links; this module never
// reads cookies. Bundle details (catalog.roblox.com) are public. Roblox items belong to Roblox and their creators.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { resolvePack, fileKey, parsePackRef } from "./pack.js";
import { parseMesh } from "../mesh.js";
import { writeMesh } from "../writer.js";

/** The shared cache folder. */
export const defaultCacheDir = () => process.env.BLOCKRIG_CACHE || path.join(os.homedir(), ".cache", "blockrig", "roblox");
const safe = (key) => key.replace(/[^\w@.-]/g, "_");

/** A cache store (the `store` resolvePack reads) with writers. */
export function packCache(dir = defaultCacheDir()) {
  const bdir = path.join(dir, "bundles"), adir = path.join(dir, "assets"), lfile = path.join(dir, "links.json");
  fs.mkdirSync(bdir, { recursive: true }); fs.mkdirSync(adir, { recursive: true });
  const links = () => (fs.existsSync(lfile) ? JSON.parse(fs.readFileSync(lfile, "utf8")) : {});
  return {
    dir,
    bundle(id) { const f = path.join(bdir, `${id}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; },
    putBundle(id, details) { fs.writeFileSync(path.join(bdir, `${id}.json`), JSON.stringify(details, null, 1)); },
    /** The file's path in the cache (whether or not it is there yet). */
    path(id, format = null) { return path.join(adir, safe(fileKey(id, format))); },
    asset(id, format = null) { const f = this.path(id, format); return fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null; },
    putAsset(id, format, bytes) { fs.writeFileSync(this.path(id, format), bytes); },
    links,
    /** Add links: an object `{ key: url }`, or the text the browser script returns (one "key url" per line). */
    addLinks(more) {
      const add = typeof more === "string" ? Object.fromEntries(more.split(/\r?\n/).map((l) => l.trim().split(/\s+/)).filter((p) => p.length === 2 && /^https:\/\//.test(p[1]))) : more;
      fs.writeFileSync(lfile, JSON.stringify({ ...links(), ...add }, null, 1));
      return Object.keys(add).length;
    },
    dropLink(key) { const l = links(); delete l[key]; fs.writeFileSync(lfile, JSON.stringify(l, null, 1)); },
  };
}

const inflate = (b) => (b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd && zlib.zstdDecompressSync ? zlib.zstdDecompressSync(b) : b);
const zstd = zlib.zstdDecompressSync ? (b) => new Uint8Array(zlib.zstdDecompressSync(b)) : undefined;

/**
 * Fill the cache for a pack as far as it can go without the browser: fetch missing bundle details (public), download
 * every asset that has a link waiting, and repeat while that makes progress. v7 (Draco) meshes are stored as v4 when
 * `decodeDraco` is given, so videos need no decoder. Returns resolvePack's `{ pack, missing }` (missing = assets that
 * need links).
 */
export async function fillPack(ref, cache, { fetch: get = globalThis.fetch, decodeDraco, log = () => {} } = {}) {
  for (let round = 0; round < 12; round++) {
    const r = resolvePack(ref, cache, { zstd });
    if (!r.missing.length) return r;
    let progress = false;
    for (const m of r.missing) {
      if (m.kind === "bundle") {
        const res = await get(`https://catalog.roblox.com/v1/bundles/${m.id}/details`);
        if (!res.ok) throw new Error(`bundle ${m.id}: catalog answered ${res.status}`);
        cache.putBundle(m.id, await res.json()); log(`bundle ${m.id}: details`); progress = true; continue;
      }
      const url = cache.links()[m.key];
      if (!url) continue;
      try {
        const res = await get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(String(res.status));
        let b = new Uint8Array(inflate(Buffer.from(await res.arrayBuffer())));
        if (decodeDraco && new TextDecoder("latin1").decode(b.subarray(0, 12)) === "version 7.00") b = writeMesh(parseMesh(b, { decodeDraco }), "4.00");
        cache.putAsset(m.id, m.format, b); log(`asset ${m.key}`); progress = true;
      } catch (e) { log(`asset ${m.key}: ${e.message} (the link expired? ask for a fresh one)`); }
      cache.dropLink(m.key);
    }
    if (!progress) return r;
  }
  return resolvePack(ref, cache, { zstd });
}

/**
 * A script for the browser (run it on a roblox.com page while signed in): asks asset delivery for a download link
 * for each missing asset and returns "key url" lines for cache.addLinks().
 */
export function locateScript(missing) {
  const needs = missing.filter((m) => m.kind === "asset").map((m) => [m.key, m.id, m.format]);
  return `(async () => {
  const needs = ${JSON.stringify(needs)};
  const out = [], fails = [];
  await Promise.all(needs.map(async ([key, id, format]) => {
    try {
      const r = await fetch("https://assetdelivery.roblox.com/v2/assetId/" + id, { credentials: "include", headers: format ? { "Roblox-AssetFormat": format } : {} });
      const j = await r.json(), u = (j.locations || [])[0]?.location;
      if (u) out.push(key + " " + u); else fails.push(key + " " + ((j.errors || [])[0]?.message || r.status));
    } catch (e) { fails.push(key + " " + e.message); }
  }));
  return out.join("\\n") + (fails.length ? "\\n# not available: " + fails.join(", ") : "");
})()`;
}

/**
 * Copy a resolved pack's files out of the cache into `<dir>/<pack key>/` (hard links when possible) with its
 * pack.json, so a video's public folder can serve them. Returns the folder.
 */
export function exportPack(pack, cache, dir) {
  const out = path.join(dir, pack.key);
  fs.mkdirSync(out, { recursive: true });
  for (const f of pack.files) {
    const src = cache.path(f.id, f.format), dst = path.join(out, safe(fileKey(f.id, f.format)));
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(dst)) fs.rmSync(dst);
    try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); }
  }
  fs.writeFileSync(path.join(out, "pack.json"), JSON.stringify(pack, null, 1));
  return out;
}

export { parsePackRef };
